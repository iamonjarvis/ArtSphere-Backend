import { gql } from "apollo-server-express";

const userTypeDefs = gql`
  type User {
    id: ID!
    name: String!
    userId: String!
    email: String!
    dob: String!
    bio: String
    profilePic: String
    followers: [User]
    following: [User]
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    getUser(userId: String!): User
  }

  type Mutation {
    signup(name: String!, userId: String!, email: String!, password: String!, dob: String!): AuthPayload
    login(userId: String!, password: String!): AuthPayload
  }
`;

export default userTypeDefs;
