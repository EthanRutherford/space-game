const {useState} = require("react");
const j = require("react-jenny");
const {roleNames} = require("../../shared/game/roles");
const AnimatedInput = require("./animated-input");
const styles = require("../styles/menu");

module.exports = function Menu({startGame, userManager}) {
	const [name, setName] = useState("");
	userManager.use();
	const users = Object.values(userManager.otherClients);

	return j({div: styles.menu}, [
		j({h1: styles.title}, "space game (title pending)"),
		j({div: styles.columns}, [
			j({div: styles.column}, [
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					activeClass: styles.active,
					onClick: startGame,
				}], "start game"),
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					maxLength: 12,
					placeholder: "enter name",
					value: name,
					onChange: (event) => {
						setName(event.target.value);
						userManager.setName(event.target.value);
					},
				}]),
			]),
			j({div: styles.column}, roleNames.map((role, id) =>
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					activeClass: styles.active,
					onClick: () => userManager.setRole(id),
				}], role),
			)),
			j({div: styles.column}, [
				j({div: styles.row}, [
					userManager.name + " (you)",
					" - " + roleNames[userManager.role],
				]),
				...users.map(
					(user) => j({div: styles.row}, [
						user.name || "(unnamed)",
						" - " + roleNames[user.role],
					]),
				),
			]),
		]),
	]);
};
