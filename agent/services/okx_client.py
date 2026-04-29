import requests

OKX_BASE = "https://www.okx.com/api/v5"

def get_btc_price():
    url = f"{OKX_BASE}/market/ticker?instId=BTC-USDT"
    res = requests.get(url).json()

    price = res["data"][0]["last"]

    return {
        "symbol": "BTC-USDT",
        "price": float(price)
    }
