import React from "react";
import {roleIds} from "Shared/game/roles";
import {Spectator} from "./game-views/spectator";
import {Pilot} from "./game-views/pilot";
import {Gunner} from "./game-views/gunner";

export function Game({userId, role, channel}) {
	if (role === roleIds.spectator) {
		return <Spectator userId={userId} channel={channel} />;
	} else if (role === roleIds.pilot) {
		return <Pilot userId={userId} channel={channel} />;
	} else if (role === roleIds.gunner) {
		return <Gunner userId={userId} channel={channel} />;
	}

	return "unsupported role";
}
