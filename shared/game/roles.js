/*	About roles
	- the spectator is the default choice. It has no control over the game,
	but is available for watching the game progress, potentially great for
	putting up on a big screen at a lan party :D

	- the pilot flies the ship, and therefore has full control over where the
	party goes. Of course, the team should collaborate on where to go, but the
	pilot has full responsibility for avoiding collisions and/or enemy fire.

	- the gunner commands the ship's weaponry. He is responsible for fighting
	off any threats, as well as using the mining lazers to harvest material from
	asteroids.

	- the engineer is responsible for the ship's power management, as well as large
	scale navigation. The ship has finite power output, and the engineer controls how
	much power is allocated to each of the ship's systems. They also have access to the
	ship's lidar mapping system.

	- the scientist uses gathered materials to research improvements to the ship.
	They also control the ship's repair drones, which use gathered materials to
	patch damaged sections of the hull.
*/

export const roleIds = {
	spectator: 0,
	pilot: 1,
	gunner: 2,
	engineer: 3,
};

export const roleNames = Object.keys(roleIds);
