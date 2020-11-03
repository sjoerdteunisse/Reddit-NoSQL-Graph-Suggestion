const commentRoutes = require('./comments.routes');
const usersRoutes = require('./users.routes');
const friendshipRoutes = require('./friendships.routes');
const threadRoutes = require('./threads.routes');

module.exports = (app) => {
    app.use('/api', commentRoutes);
    app.use('/api', usersRoutes);
    app.use('/api', threadRoutes);
    app.use('/api', friendshipRoutes);
};
