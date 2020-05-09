import {render} from "react-dom";
import React, {useState, useMemo} from "react";
import {Config} from "Shared/serial";
import {UserManager} from "./logic/user-manager";
import {Menu} from "./ui/menu";
import {GameUi} from "./ui/game";
import "./styles/reset";
import "./styles/root";

function App() {
	const [page, setPage] = useState("menu");
	const userManager = useMemo(() => new UserManager(), []);

	function startGame() {
		setPage("game");
		userManager.channel.sendConfig({
			type: Config.start,
			userId: userManager.userId,
		});
	}

	if (page === "menu") {
		return <Menu startGame={startGame} userManager={userManager} />;
	}

	if (page === "game") {
		return <GameUi userManager={userManager} />;
	}

	return Error("bad");
}

render(<App />, document.getElementById("react-root"));
