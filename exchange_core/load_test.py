from locust import HttpUser, task, between
import random
import uuid
import time
import threading

SYMBOL = "AAPL"
START_PRICE = 18800  # $188.00 in cents


class MarketState:
    """
    Shared price state across all simulated users.
    Drifts with a Gaussian random walk — simulates realistic intraday price movement.
    """
    def __init__(self, start_price: int):
        self._price = start_price
        self._lock = threading.Lock()
        self._last_drift = time.time()

    def get_mid(self) -> int:
        self._maybe_drift()
        return self._price

    def _maybe_drift(self):
        now = time.time()
        with self._lock:
            elapsed = now - self._last_drift
            steps = int(elapsed)
            if steps < 1:
                return
            for _ in range(steps):
                # ~0.1% std-dev per second → realistic intraday volatility
                move = random.gauss(0, self._price * 0.001)
                self._price = max(15000, min(25000, self._price + int(move)))
            self._last_drift += steps


# Single shared instance — all users reference the same drifting price
_market = MarketState(START_PRICE)


class MarketMaker(HttpUser):
    """
    Posts two-sided limit orders (bid + ask) around the current mid price,
    refreshing quotes as the price drifts. Provides the liquidity that makes
    trades happen.

    Suggested spawn ratio: ~25% of total users.
    """
    weight = 1
    wait_time = between(0.3, 0.8)

    def on_start(self):
        self.user_id = f"mm_{uuid.uuid4().hex[:8]}"
        self.order_ids = []

    @task(5)
    def post_two_sided_quote(self):
        mid = _market.get_mid()
        half_spread = random.randint(3, 10)  # 3–10 cent half-spread

        for side, price in [
            ("BUY",  mid - half_spread),
            ("SELL", mid + half_spread),
        ]:
            payload = {
                "user_id": self.user_id,
                "symbol": SYMBOL,
                "side": side,
                "type": "LIMIT",
                "qty": random.randint(10, 50),
                "price_cents": max(1, price),
                "client_order_id": str(uuid.uuid4()),
            }
            with self.client.post("/orders", json=payload, catch_response=True) as resp:
                if resp.status_code == 200:
                    order_id = resp.json().get("order_id")
                    if order_id:
                        self.order_ids.append(order_id)
                    resp.success()
                else:
                    resp.failure(f"Quote failed: {resp.text}")

    @task(2)
    def cancel_stale_quote(self):
        """Cancel oldest quote so market maker tracks the drifting price."""
        if not self.order_ids:
            return
        order_id = self.order_ids.pop(0)
        with self.client.delete(f"/orders/{order_id}", catch_response=True) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Cancel failed: {resp.text}")


class RetailTrader(HttpUser):
    """
    Retail participant: places aggressive limit orders near/across mid and
    occasional market orders. These cross the market maker's quotes and
    generate the trades that build candles.

    Suggested spawn ratio: ~75% of total users.
    """
    weight = 3
    wait_time = between(0.5, 2.0)

    def on_start(self):
        self.user_id = f"retail_{uuid.uuid4().hex[:8]}"
        self.order_ids = []

    @task(4)
    def place_aggressive_limit(self):
        """
        Aggressive limit: priced to cross the spread and trade immediately.
        BUY orders are priced above mid, SELL orders below mid.
        """
        mid = _market.get_mid()
        side = random.choice(["BUY", "SELL"])

        if side == "BUY":
            # Above mid — will match resting asks
            price = mid + random.randint(1, 15)
        else:
            # Below mid — will match resting bids
            price = mid - random.randint(1, 15)

        payload = {
            "user_id": self.user_id,
            "symbol": SYMBOL,
            "side": side,
            "type": "LIMIT",
            "qty": random.randint(1, 20),
            "price_cents": max(1, price),
            "client_order_id": str(uuid.uuid4()),
        }
        with self.client.post("/orders", json=payload, catch_response=True) as resp:
            if resp.status_code == 200:
                order_id = resp.json().get("order_id")
                if order_id:
                    self.order_ids.append(order_id)
                resp.success()
            else:
                resp.failure(f"Limit order failed: {resp.text}")

    @task(3)
    def place_market_order(self):
        """Guaranteed fill when book has liquidity — directly generates trades."""
        payload = {
            "user_id": self.user_id,
            "symbol": SYMBOL,
            "side": random.choice(["BUY", "SELL"]),
            "type": "MARKET",
            "qty": random.randint(1, 10),
            "client_order_id": str(uuid.uuid4()),
        }
        with self.client.post("/orders", json=payload, catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Market order failed: {resp.text}")

    @task(1)
    def cancel_order(self):
        if not self.order_ids:
            return
        order_id = random.choice(self.order_ids)
        self.order_ids.remove(order_id)
        with self.client.delete(f"/orders/{order_id}", catch_response=True) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Cancel failed: {resp.text}")

    @task(1)
    def get_snapshot(self):
        with self.client.get("/book/snapshot?depth=10", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Snapshot failed: {resp.text}")
