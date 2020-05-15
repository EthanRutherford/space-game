import React from "react";
import {roleIds} from "Shared/game/roles";
import {Spectator} from "./game-views/spectator";
import {Pilot} from "./game-views/pilot";
import {Gunner} from "./game-views/gunner";
import {Engineer} from "./game-views/engineer";

export function Game({userId, role}) {
	if (role === roleIds.spectator) {
		return <Spectator userId={userId} />;
	} else if (role === roleIds.pilot) {
		return <Pilot userId={userId} />;
	} else if (role === roleIds.gunner) {
		return <Gunner userId={userId} />;
	} else if (role === roleIds.engineer) {
		return <Engineer userId={userId} />;
	}

	return "unsupported role";
}
