const { GraphQLServer } = require('graphql-yoga');
// Resolvers - Where does this data come from and what does this data do within the database
// Query = pulling data, Mutation = pushing data
// Import mutations, query and db file
const Mutation = require('./resolvers/Mutation');
const Query = require('./resolvers/Query');
const db = require('./db');

// Create the GraphQL Yoga Server

function createServer() {
    return new GraphQLServer({
        typeDefs: 'src/schema.graphql',
        resolvers: {
            Mutation: Mutation,
            Query: Query
        },
        resolverValidationOptions: {
            requireResolversForResolveType: false
        },
        context: req => ({ ...req, db })
    });
}

module.exports = createServer;
