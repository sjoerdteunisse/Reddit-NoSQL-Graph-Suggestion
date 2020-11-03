/*  Neo4j_connector.js:
*   require this file any time you need to use neo4j.
*   retrieve the session with neo4j.getSession(), use session for queries.
*   after usage, close the connection with session.close()
*/

// TODO: set env. variables for login / uri
let uri = "bolt://localhost:7687"
let user = "neo4j"
let password = "test123"

let testdb = "bolt://hobby-ijmcicbddikmgbkehfgfiddl.dbs.graphenedb.com:24787";
let testdbuser = "vmuser";
let testdbpassword = "b.o2UJ38SKRhQn.QJXpLc4w3hrt873R";

let prodDb = "bolt://hobby-eimcicbddikmgbkeemgfiddl.dbs.graphenedb.com:24787";
let prodDbuser = "vmuser";
let prodDbpassword = "b.ijdow8ACebGQ.4lRwSBjf3GrrI2Lf";

const neo4j = require("neo4j-driver").v1;

let driver = null;
if(process.env.NODE_ENV == 'local'){
   console.log('connected to local database neo4j');
   driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
} else if(process.env.NODE_ENV == 'production'){
    console.log('connected to production database neo4j');
    driver = neo4j.driver(prodDb, neo4j.auth.basic(prodDbuser, prodDbpassword))
}
else if(process.env.NODE_ENV  == 'test'){
   console.log('connected to test database neo4j');
   driver = neo4j.driver(testdb, neo4j.auth.basic(testdbuser, testdbpassword))
}

module.exports = {
    getSession(type){
        switch (type) {
            case 'r':
                return driver.session(neo4j.session.READ);
            case 'w':
                return driver.session(neo4j.session.WRITE);
            default:
                return driver.session();;
        }
       
    }

    // getConnection() {
       
        //graphenedb

        // let instance = null;

        // if(process.env.NODE_ENV !== 'test'){
        //     instance = new Neode("bolt://localhost:7687", "neo4j", "test123");
        // }
        // else if (process.env.NODE_ENV === 'production'){
            
        // }

        //testuser
        //nodeuser
        //b.DRlACMyNpeWe.B0jjgcJibs4KbFut

        //production
        //nodeuser
        //b.DVAOa5mHRmnv.zdXWNzXQMsQogQtL
        

        //Todo, localhost to env with username and password
        //Todo, look if we can promise the object below
        // console.log('Neo4J instantiated');

    //     instance.model('Friends', {
    //         person_id: {
    //             primary: true,
    //             type: 'uuid',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         },
    //         person_id_mongo: {
    //             type: 'string',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         },
    //         personName: {
    //             type: 'string',
    //             required: true
    //         }
    //     });

    //     instance.model('Friends').relationship('isFriendsWith', 'relationship', 'FRIENDSWITH', 'out', 'Friends', {
    //         since: {
    //             type: 'date',
    //             required: true,
    //         }
    //     });

    //     instance.model('Thread', {
    //         thread_id: {
    //             primary: true,
    //             type: 'uuid',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         },
    //         thread_id_mongo: {
    //             type: 'string',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         },
    //         thread_title: {
    //             type: 'string',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         }
    //     });

    //     instance.model('Topic', {
    //         topid_id: {
    //             primary: true,
    //             type: 'uuid',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         },
    //         normalizedName: {
    //             type: 'string',
    //             required: true, // Creates an Exists Constraint in Enterprise mode
    //         }
    //     });
        

    //     instance.model('Thread').relationship('contains', 'relationship', 'CONTAINS', 'out', 'Topic');

    //     return instance; 
    // }
}