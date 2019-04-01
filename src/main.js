const {render} = require("react-dom");
const {useState} = require("react");
const j = require("react-jenny");
const Menu = require("./ui/menu");
const Game = require("./ui/game");
require("./styles/reset");
require("./styles/root");

function App() {
	const [page, setPage] = useState("menu");
	const [ip, setIp] = useState();

	function startGame(address) {
		setPage("game");
		setIp(address || "localhost");
	}

	if (page === "menu") {
		return j([Menu, {startGame}]);
	}

	if (page === "game") {
		return j([Game, {ip}]);
	}

	return Error("bad");
}

render(j([App]), document.getElementById("react-root"));
