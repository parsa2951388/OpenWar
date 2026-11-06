# New / Operations public availability

## Public server policy

The New edition is informational on public hosts until its online Operations
backend is complete. The edition selector remains visible, but its public
landing page:

- displays an "In development" status and a short explanation;
- shows the planned public-lobby, private-room, and matchmaking capabilities;
- renders all online entry controls disabled;
- does not render the playable Operations campaign or its mission launch
  controls.

Operations mission entry is also guarded inside `EditionHub` and
`SinglePlayerModal`; hiding the launch buttons is not the only protection.
The Operations campaign remains available on `localhost` and `127.0.0.1`
for development and QA. Classic remains available on public servers.

## Existing Classic systems

Classic already contains public/private lobbies, solo and tutorial flows,
ranked/clan systems, alliances and diplomacy, ports, warships, trains,
factories, missile silos, SAMs, strategic weapons, player profiles, progression,
leaderboards, clans, and replay tools. The home screen now surfaces these
existing systems instead of implying that a blank feature set is waiting in
New.

The repository also contains the Doomsday Clock zone mechanic, which supplies
a battle-royale-style shrinking-pressure match variant. It is not a new
OpenBattle integration.

## Roadmap for online Operations

The public status panel describes intended work, not implemented or bookable
features. Before enabling it on a public host, the project still needs a
complete online Operations design and implementation, including lobby
lifecycle, matchmaking rules, authoritative server validation, multiplayer
mission state, reconnect behavior, abuse controls, telemetry, and end-to-end
tests.

## Verification

- `tests/client/EditionHub.test.ts` checks the public-host allowlist.
- `tests/client/components/EditionHub.test.ts` checks that online Operations
  actions are disabled and the existing Classic feature overview is rendered.
- `SinglePlayerModal.openForOperation` and `onOpen` independently guard
  Operations mission entry on public hosts.

Do not widen `isOperationsPlayableHost` beyond local development hosts until
the public multiplayer implementation passes its release gates.
