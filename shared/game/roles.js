export const roleNames = [
	"spectator",
	"pilot",
	"gunner",
];

export const roleIds = roleNames.reduce((map, role, index) => {
	map[role] = index;
	return map;
}, {});
