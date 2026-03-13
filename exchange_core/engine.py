from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from models import Order, OrderStatus
from matcher import match_order
from orderbook import OrderBook


@dataclass
class Command:
    seq: int
    type: str   # NEW_ORDER | CANCEL_ORDER
    payload: Dict[str, Any]


class Sequencer:
    """
    In-memory monotonic sequencer + basic idempotency mapping.
    """
    def __init__(self) -> None:
        self._seq = 0
        self._lock = asyncio.Lock()
        self._idempotency_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        # key = (user_id, client_order_id)

    async def next_seq(self) -> int:
        async with self._lock:
            self._seq += 1
            return self._seq

    def get_idempotent_result(self, user_id: str, client_order_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not client_order_id:
            return None
        return self._idempotency_map.get((user_id, client_order_id))

    def save_idempotent_result(self, user_id: str, client_order_id: Optional[str], result: Dict[str, Any]) -> None:
        if not client_order_id:
            return
        self._idempotency_map[(user_id, client_order_id)] = result


class MatchingEngineService:
    """
    Single-writer matching engine service.
    Commands are processed one-by-one from a queue.
    """
    def __init__(self, symbol: str = "AAPL") -> None:
        self.book = OrderBook(symbol)
        self.command_queue: asyncio.Queue[Command] = asyncio.Queue()
        self.event_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()

        self.seq_applied: int = 0
        self.running: bool = False

        self.trades: List[Dict[str, Any]] = []
        self.orders: Dict[str, Order] = {}

    async def submit(self, cmd: Command) -> None:
        await self.command_queue.put(cmd)

    async def run(self) -> None:
        self.running = True
        while self.running:
            cmd = await self.command_queue.get()
            self.seq_applied = cmd.seq

            if cmd.type == "NEW_ORDER":
                await self._handle_new_order(cmd)
            elif cmd.type == "CANCEL_ORDER":
                await self._handle_cancel_order(cmd)

    async def _handle_new_order(self, cmd: Command) -> None:
        order: Order = cmd.payload["order"]
        self.orders[order.order_id] = order

        await self.event_queue.put({
            "type": "OrderAccepted",
            "seq": cmd.seq,
            "order_id": order.order_id,
            "user_id": order.user_id,
            "symbol": order.symbol,
            "status": order.status.value,
        })

        trades = match_order(self.book, order)

        # user-specific update
        await self.event_queue.put({
            "type": "OrderUpdate",
            "seq": cmd.seq,
            "order_id": order.order_id,
            "user_id": order.user_id,
            "symbol": order.symbol,
            "status": order.status.value,
            "remaining_qty": order.remaining_qty,
            "reject_reason": order.reject_reason,
        })

        for t in trades:
            event = {
                "type": "TradeExecuted",
                "seq": cmd.seq,
                "trade_id": t.trade_id,
                "symbol": t.symbol,
                "price_cents": t.price_cents,
                "qty": t.qty,
                "maker_order_id": t.maker_order_id,
                "taker_order_id": t.taker_order_id,
                "ts_ms": t.ts_ms,
            }
            self.trades.append(event)
            await self.event_queue.put(event)

            maker = self.orders.get(t.maker_order_id)
            taker = self.orders.get(t.taker_order_id)

            # maker private update
            if maker:
                await self.event_queue.put({
                    "type": "OrderUpdate",
                    "seq": cmd.seq,
                    "order_id": maker.order_id,
                    "user_id": maker.user_id,
                    "symbol": maker.symbol,
                    "status": maker.status.value,
                    "remaining_qty": maker.remaining_qty,
                    "reject_reason": maker.reject_reason,
                })

            # taker private update again after trade
            if taker:
                await self.event_queue.put({
                    "type": "OrderUpdate",
                    "seq": cmd.seq,
                    "order_id": taker.order_id,
                    "user_id": taker.user_id,
                    "symbol": taker.symbol,
                    "status": taker.status.value,
                    "remaining_qty": taker.remaining_qty,
                    "reject_reason": taker.reject_reason,
                })

        await self.event_queue.put(self._book_l1_event(cmd.seq))
        await self.event_queue.put(self._book_snapshot_event(cmd.seq))

    async def _handle_cancel_order(self, cmd: Command) -> None:
        order_id = cmd.payload["order_id"]
        order = self.orders.get(order_id)

        ok = self.book.cancel(order_id)
        if ok:
            status = "CANCELED"
            user_id = order.user_id if order else None
            symbol = order.symbol if order else self.book.symbol
        else:
            status = "CANCEL_FAILED"
            user_id = order.user_id if order else None
            symbol = order.symbol if order else self.book.symbol

        await self.event_queue.put({
            "type": "OrderUpdate",
            "seq": cmd.seq,
            "order_id": order_id,
            "user_id": user_id,
            "symbol": symbol,
            "status": status,
        })

        await self.event_queue.put(self._book_l1_event(cmd.seq))
        await self.event_queue.put(self._book_snapshot_event(cmd.seq))

    def _book_l1_event(self, seq: int) -> Dict[str, Any]:
        snap = self.book.snapshot_l2(depth=1)
        best_bid = snap["bids"][0] if snap["bids"] else None
        best_ask = snap["asks"][0] if snap["asks"] else None

        return {
            "type": "BookL1",
            "seq": seq,
            "symbol": self.book.symbol,
            "best_bid": best_bid,
            "best_ask": best_ask,
        }

    def _book_snapshot_event(self, seq: int) -> Dict[str, Any]:
        snap = self.book.snapshot_l2(depth=10)
        return {
            "type": "BookSnapshot",
            "seq": seq,
            "symbol": self.book.symbol,
            "bids": snap["bids"],
            "asks": snap["asks"],
        }