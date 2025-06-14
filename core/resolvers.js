// *************** IMPORT LIBRARY ***************
const { mergeResolvers } = require('@graphql-tools/merge');

// *************** IMPORT MODULE *************** 
const userResolvers = require('../modules/user/user.resolvers');
const studentResolvers = require('../modules/student/student.resolvers');
const schoolResolvers = require('../modules/school/school.resolvers');

// *************** EXPORT MODULE ***************
module.exports = mergeResolvers([userResolvers, schoolResolvers, studentResolvers]);