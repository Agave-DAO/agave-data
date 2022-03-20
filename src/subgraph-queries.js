import fetch from "node-fetch";
import fs from "fs";

const GRAPHQL_URL = "https://api.thegraph.com/subgraphs/name/agave-dao/agave-xdai";

async function fetchAllUsers() {
    let skipN = 0;
    let users = [];
    for (skipN; skipN < 1300; skipN = skipN + 100) {
      const newUsers = await queryUserIds(skipN);
      users = users.concat(newUsers);
    }
    return users;
}

async function queryUserIds(skipN) {
    // Construct a schema, using GraphQL schema language
    const querySchema = `
  {
      users(orderBy:id ,skip:${skipN}) {
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