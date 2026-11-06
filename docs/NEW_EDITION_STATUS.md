# New edition and multiplayer status

## Public online servers

The `New · Operations` edition is informational only on public hosts while its online gameplay is under construction. The page explains the planned public operations, private command rooms, and matchmaking flows, but does not expose launch actions.

Operations solo mission entry is also gated in the client on public hosts. `localhost` and `127.0.0.1` remain available for local development and QA. Classic remains the public playable edition.

## Existing gameplay systems in Classic

Classic already contains territory expansion, free-for-all and team queues, public lobby browsing, private rooms, diplomacy and alliances, quick chat and emojis, ranked matchmaking, clans, player profiles and leaderboards, replay viewing, ports, trade routes, warships, factories, trains, missile silos, SAMs, atom bombs, and Doomsday Clock mechanics.

The home screen surfaces these existing systems in a feature overview. It does not label roadmap concepts such as supply-line objectives or reconnaissance fog as playable features.

## Reference comparison

- OpenBattle's public description focuses on browser-based multiplayer battle-royale territory expansion and eliminating opponents. Publicly accessible materials do not establish a detailed feature-by-feature specification or provide a verifiable source tree for the current web game.
- OpenFront's public source and changelog describe systems including ranked queues, clans, progression, replay viewing, smarter nations, quick chat, naval and trade mechanics, and many maps. Open War already contains implementations of many of these systems in its engine and client.
- Open War uses its own implementation and UI. Any reuse from AGPL-licensed OpenFront source must preserve the applicable license and attribution requirements.

## Scope not represented as shipped

Dedicated online Operations lobbies, secure Operations matchmaking, cloud-synced campaign progression, convoy objectives, and reconnaissance/fog-of-war objectives remain future work. The public New page intentionally keeps them locked until implemented and tested end to end.
