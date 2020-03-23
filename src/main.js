import {render} from "react-dom";
import {useState, useMemo} from "react";
import j from "react-jenny";
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
		return j([Menu, {startGame, userManager}]);
	}

	if (page === "game") {
		return j([GameUi, userManager]);
	}

	return Error("bad");
}

render(j([App]), document.getElementById("react-root"));
