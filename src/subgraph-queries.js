import fetch from "node-fetch";
import fs from "fs";

const GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/agave-dao/agave-xdai";

async function fetchAllUsers() {
    let users = [];
    let userId = "";
    while(true) {
      const newUsers = await queryUserIds(userId);
      users = users.concat(newUsers);
      if (newUsers.length < 1000){
        break;
      }
      userId = users[users.length - 1].id;
    }
    return users;
}

async function queryUserIds(userId) {
    // Construct a schema, using GraphQL schema language
    const querySchema = `
    {
        users(orderBy:id ,first:1000, where:{id_gt: "${userId}"}) {
          id
        }
    } 
  `;
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: querySchema,
      }),
    });
    
    const responseBody = await response.json();
    return responseBody.data.users;
  }

  export {fetchAllUsers};