import pushkin from 'pushkin-api';
import knex from 'knex';

const production = process.env.NODE_ENV === 'production';

// Database connection configuration
const dbConfig = {
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_DB,
	ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false
};

const db = knex({
	client: 'pg',
	connection: dbConfig
});

const userController = new pushkin.ControllerBuilder();

// Custom endpoint to register/update Auth0 user
userController.setDirectUse('/registerAuth0User', async (req, res) => {
		try {
			const { auth0_id, email, name, picture, auth_provider } = req.body;

			if (!auth0_id) {
				return res.status(400).json({ error: 'auth0_id is required' });
			}

			const timestamp = new Date();

			// Check if user with this Auth0 ID already exists
			const existingUser = await db('pushkin_users')
				.where({ auth0_id })
				.first();

			if (existingUser) {
				// User exists - just update their profile info
				await db('pushkin_users')
					.where({ auth0_id })
					.update({
						email,
						name,
						picture,
						auth_provider,
						updated_at: timestamp
					});

				res.json({
					success: true,
					user_id: existingUser.user_id,
					message: 'User updated'
				});
			} else {
				// New Auth0 user - create a completely new user record
				// Generate a new UUID for this user (not using session ID)
				const { v4: uuidv4 } = require('uuid');
				const user_id = uuidv4();

				await db('pushkin_users').insert({
					user_id,
					auth0_id,
					email,
					name,
					picture,
					auth_provider,
					created_at: timestamp,
					updated_at: timestamp
				});

				res.json({
					success: true,
					user_id,
					message: 'User created'
				});
			}
		} catch (error) {
			console.error('Error registering Auth0 user:', error);
			res.status(500).json({ error: 'Failed to register user', details: error.message });
		}
	}, 'post');

// Optional: Endpoint to get user by Auth0 ID
userController.setDirectUse('/getAuth0User/:auth0_id', async (req, res) => {
	try {
		const { auth0_id } = req.params;

		const user = await db('pushkin_users')
			.where({ auth0_id })
			.first();

		if (user) {
			res.json({ success: true, user });
		} else {
			res.status(404).json({ error: 'User not found' });
		}
	} catch (error) {
		console.error('Error fetching Auth0 user:', error);
		res.status(500).json({ error: 'Failed to fetch user', details: error.message });
	}
}, 'get');

module.exports = userController;
