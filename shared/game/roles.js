const roleNames = [
	"spectator",
	"pilot",
	"gunner",
];

const roleIds = roleNames.reduce((map, role, index) => {
	map[role] = index;
	return map;
}, {});

module.exports = {roleNames, roleIds};
