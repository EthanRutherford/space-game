const {useRef} = require("react");
const j = require("react-jenny");
const AnimatedInput = require("./animated-input");
const styles = require("../styles/menu");

module.exports = function Menu(props) {
	const input = useRef();

	return j({div: styles.menu}, [
		j({h1: styles.title}, "space game (title pending)"),
		j({div: styles.columns}, [
			j({div: styles.column}, [
				j([AnimatedInput, {
					className: styles.button,
					hoverClass: styles.hover,
					activeClass: styles.active,
					onClick: () => props.startGame(input.current.value),
				}], "join"),
			]),
			j({div: styles.column}, [
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					placeholder: "localhost",
					ref: input,
				}]),
			]),
		]),
	]);
};
