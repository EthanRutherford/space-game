const {render} = require("react-dom");
const {useState, useMemo} = require("react");
const j = require("react-jenny");
const {Config} = require("../shared/serial");
const UserManager = require("./logic/user-manager");
const Menu = require("./ui/menu");
const Game = require("./ui/game");
require("./styles/reset");
require("./styles/root");

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
		return j([Game, {channel: userManager.channel}]);
	}

	return Error("bad");
}

render(j([App]), document.getElementById("react-root"));
