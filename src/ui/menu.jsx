import React, {useState, useEffect} from "react";
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

	return (
		<div className={styles.menu}>
			<h1 className={styles.title}>space game (title pending)</h1>
			<div className={styles.columns}>
				<div className={styles.column}>
					<AnimatedInput
						className={styles.input}
						hoverClass={styles.hover}
						activeClass={styles.active}
						onClick={startGame}
						disabled={!spritesLoaded}
					>
						start game
					</AnimatedInput>
					<AnimatedInput
						className={styles.input}
						hoverClass={styles.hover}
						maxLength={12}
						placeholder="enter name"
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							userManager.setName(event.target.value);
						}}
					/>
				</div>
				<div className={styles.column}>
					{roleNames.map((role, id) => (
						<AnimatedInput
							className={styles.input}
							hoverClass={styles.hover}
							activeClass={styles.active}
							onClick={() => userManager.setRole(id)}
							key={id}
						>
							{role}
						</AnimatedInput>
					))}
				</div>
				<div className={styles.column}>
					<div className={styles.row}>
						{userManager.name} (you) - {roleNames[userManager.role]}
					</div>
					{users.map((user) => (
						<div className={styles.row} key={user.id}>
							{user.name || "(unnamed)"} - {roleNames[user.role]}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
