import {useState, useEffect} from "react";
import j from "react-jenny";
import {roleNames} from "Shared/game/roles";
import {AnimatedInput} from "./animated-input";
import styles from "../styles/menu";
import {spritesPromise} from "../logic/renderables";

export function Menu({startGame, userManager}) {
	const [name, setName] = useState("");
	const [spritesLoaded, setSpritesLoaded] = useState(false);
	userManager.use();
	const users = Object.values(userManager.otherClients);

	useEffect(() => {
		spritesPromise.then(() => setSpritesLoaded(true));
	}, []);

	return j({div: styles.menu}, [
		j({h1: styles.title}, "space game (title pending)"),
		j({div: styles.columns}, [
			j({div: styles.column}, [
				j([AnimatedInput, {
					className: styles.input,
					hoverClass: styles.hover,
					activeClass: styles.active,
					onClick: startGame,
					disabled: !spritesLoaded,
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
}
