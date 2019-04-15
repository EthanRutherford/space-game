const {useState} = require("react");
const j = require("react-jenny");
const {Config} = require("../../shared/serial");
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
						userManager.channel.sendConfig({
							type: Config.name,
							userId: userManager.userId,
							name: event.target.value,
						});
					},
				}]),
			]),
			j({div: styles.column}, [
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					activeClass: styles.active,
				}], "pilot"),
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					activeClass: styles.active,
				}], "gunner"),
			]),
			j({div: styles.column}, [
				// assignments go here
			]),
			j({div: styles.column}, [
				j({div: 0}, (userManager.name || "") + " (you)"),
				...users.map(
					(user) => j({div: 0}, user.name || "(unnamed)"),
				),
			]),
		]),
	]);
};
