const {useState, useEffect} = require("react");
const DataChannel = require("./data-channel");
const {Config} = require("Shared/serial");

module.exports = class UserManager {
	constructor() {
		this.channel = new DataChannel();
		this.userId = null;
		this.name = "";
		this.role = 0;

		this.otherClients = {};
		this.updaters = new Set();

		const update = () => {
			for (const updater of this.updaters) {
				updater({});
			}
		};

		this.channel.addListener((message) => {
			if (message.type === Config) {
				if (message.data.type === Config.init) {
					this.userId = message.data.userId;
					for (const user of message.data.users) {
						this.otherClients[user.userId] = user;
					}

					update();
				} else if (message.data.type === Config.newUser) {
					const user = message.data.user;
					this.otherClients[user.userId] = user;
					update();
				} else if (message.data.type === Config.userDced) {
					delete this.otherClients[message.data.userId];
					update();
				} else {
					let client = this;
					if (message.data.userId !== this.userId) {
						if (this.otherClients[message.data.userId] == null) {
							this.otherClients[message.data.userId] = {
								userId: message.data.userId,
								name: null,
								role: null,
							};
						}

						client = this.otherClients[message.data.userId];
					}

					if (message.data.type === Config.name) {
						client.name = message.data.name;
						update();
					} else if (message.data.type === Config.role) {
						client.role = message.data.role;
						update();
					}
				}
			}
		});
	}
	setName(name) {
		this.channel.sendConfig({
			type: Config.name,
			userId: this.userId,
			name,
		});
	}
	setRole(role) {
		this.channel.sendConfig({
			type: Config.role,
			userId: this.userId,
			role,
		});
	}
	use() {
		const [, update] = useState();
		useEffect(() => {
			update({});
			this.updaters.add(update);
			return () => this.updaters.delete(update);
		}, []);
	}
};
