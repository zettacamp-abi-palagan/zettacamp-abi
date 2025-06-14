// *************** IMPORT LIBRARY ***************
const { gql } = require('apollo-server-express');

// *************** EXPORT MODULE ***************
module.exports = gql`
    enum Status {
        ACTIVE
        INACTIVE
        DELETED
    }

    type School {
        id: ID!
        commercial_name: String!
        legal_name: String!
        address: String!
        city: String!
        country: String!
        zipcode: String!
        logo: String
        school_status: Status!
        students: [Student!]!
        created_by: User!
        created_at: String!
        updated_by: User!
        updated_at: String!
    }

    input CreateSchoolInput {
        commercial_name: String!
        legal_name: String!
        address: String!
        city: String!
        country: String!
        zipcode: String!
        logo: String
        school_status: Status!
    }

    input UpdateSchoolInput {
        commercial_name: String!
        legal_name: String!
        address: String!
        city: String!
        country: String!
        zipcode: String!
        logo: String
        school_status: Status!
    }

    type Query {
        GetAllSchools: [School!]!
        GetOneSchool(id: ID!): School
    }

    type Mutation {
        CreateSchool(input: CreateSchoolInput!): School!
        UpdateSchool(id: ID!, input: UpdateSchoolInput!): School!
        DeleteSchool(id: ID!): School!
    }
`