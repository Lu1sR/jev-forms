"""Start the API on both IPv4 and IPv6.

uvicorn's `--host ::` is IPv6-only under asyncio, and Railway's private network
resolves service names to IPv4 and IPv6 (IPv6 only in older environments), so
we open one socket per family and hand both to uvicorn.
"""
from __future__ import annotations

import os
import socket

import uvicorn


def _socket(family: int, host: str, port: int) -> socket.socket:
    s = socket.socket(family, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if family == socket.AF_INET6:
        s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
    s.bind((host, port))
    s.listen(2048)
    s.setblocking(False)
    return s


def main() -> None:
    port = int(os.getenv("PORT", "8000"))
    sockets = [_socket(socket.AF_INET, "0.0.0.0", port)]
    if socket.has_ipv6:
        try:
            sockets.append(_socket(socket.AF_INET6, "::", port))
        except OSError:  # no IPv6 in this container (e.g. local Docker)
            pass
    config = uvicorn.Config("app.api:app", proxy_headers=True, forwarded_allow_ips="*")
    uvicorn.Server(config).run(sockets=sockets)


if __name__ == "__main__":
    main()
