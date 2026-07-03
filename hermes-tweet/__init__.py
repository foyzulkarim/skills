from __future__ import annotations

if __package__:
    from .hermes_tweet import register
else:
    from hermes_tweet import register

__all__ = ["register"]
