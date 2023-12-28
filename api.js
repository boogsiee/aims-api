const express = require("express");
const { uuid } = require("uuidv4");
const router = express.Router();

module.exports.setupRoutes = (db) => {
  router.get("/users", (req, res) => {
    const { strand_name, section_number, batch_year } = req.query;

    if (section_number && batch_year) {
      const sqlQuery =
        "SELECT * FROM Users WHERE section_number = ? AND batch_year = ?";

      return db.all(sqlQuery, [section_number, batch_year], (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
        res.json(rows);
      });
    } else if (section_number) {
      const sqlQuery = "SELECT * FROM Users WHERE section_number = ?";

      return db.all(sqlQuery, [section_number], (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
        res.json(rows);
      });
    } else if (batch_year) {
      const sqlQuery = "SELECT * FROM Users WHERE batch_year = ?";

      return db.all(sqlQuery, [batch_year], (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
        res.json(rows);
      });
    } else {
      const sqlQuery = "SELECT * FROM Users ORDER BY reg_date DESC";

      return db.all(sqlQuery, (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
        res.json(rows);
      });
    }
  });
  router.patch("/users/:userId", async (req, res) => {
    const userId = req.params.userId;
    const updateFields = req.body;

    try {
      // Check if the user with the given ID exists
      const existingUser = await db.get(
        "SELECT * FROM Users WHERE user_ID = ?",
        [userId]
      );

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Filter out undefined values (fields not provided in the request body)
      const filteredFields = Object.fromEntries(
        Object.entries(updateFields).filter(
          ([key, value]) => value !== undefined
        )
      );

      // If there are no valid fields to update, respond with an error
      if (Object.keys(filteredFields).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // Build the SET clause dynamically based on the filtered fields
      const setClause = Object.keys(filteredFields)
        .map((field) => `${field} = ?`)
        .join(", ");

      // Perform the update
      const values = [...Object.values(filteredFields), userId];
      await db.run(`UPDATE Users SET ${setClause} WHERE user_ID = ?`, values);

      // Fetch and return the updated user
      const updatedUser = await db.get(
        "SELECT * FROM Users WHERE user_ID = ?",
        [userId]
      );

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/user-search", (req, res) => {
    const { strand_name, section_number, batch_year, search } = req.query;

    // Base SQL query
    let sqlQuery = "SELECT * FROM Users WHERE 1";

    const params = [];

    if (section_number) {
      sqlQuery += " AND section_number = ?";
      params.push(section_number);
    }

    if (batch_year) {
      sqlQuery += " AND batch_year = ?";
      params.push(batch_year);
    }

    // Add conditions for search
    if (search && search.trim() !== "") {
      sqlQuery += " AND (user_fname LIKE ? OR user_lname LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Execute the dynamic query
    db.all(sqlQuery, params, (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  router.get("/users/roles/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
      const usersWithRoles = await db.get(
        "SELECT Users.user_ID, Users.user_fname, UserType.user_type_role FROM Users JOIN UserType ON Users.user_type_role = UserType.user_type_role WHERE Users.user_ID = ?",
        [userId]
      );
      if (usersWithRoles) {
        return res.status(200).json({ users: usersWithRoles });
      } else {
        return res.status(404).json({ users: [], message: "Not found" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500);
    }
  });

  router.get("/users/count", (_, res) => {
    db.get("SELECT COUNT(user_ID) AS totalUsers FROM Users", (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ error: "Internal Server Error", message: err.message });
      }

      if (!result || result.totalUsers === undefined) {
        return res.status(404).json({
          error: "User not found",
          message: "No users found in the database",
        });
      }

      const totalUsers = result.totalUsers;

      res.json({ totalUsers });
    });
  });

  router.post("/verify/:user_Id", async (req, res) => {
    try {
      // Extract data from the request body
      const { user_Id, uname, pword, contact } = req.body;

      // Insert data into the Verify table
      const insertQuery = `
        INSERT INTO Verify (user_Id, uname, pword)
        VALUES (?, ?, ?)
      `;

      // Execute the SQL query
      await db.run(insertQuery, [user_Id, uname, pword]);

      // Send a response back to the client
      res.status(201).json({
        message: "Data inserted into Verify table successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  const bcrypt = require("bcrypt");
  // Assuming getUserByUserId is a function that retrieves a user by user_ID
  router.post("/login", async (req, res) => {
    const { username, pword } = req.body;

    if (!username || !pword) {
      return res.status(400).json({ error: "Invalid request" });
    }

    try {
      // Directly query the Verify table to retrieve user data by username
      const user = await db.get('SELECT * FROM "Verify" WHERE uname = ?', [
        username,
      ]);

      if (user) {
        // Validate the password against the retrieved user details
        const passwordMatch = await bcrypt.compare(pword, user.pword);

        if (passwordMatch) {
          return res.json({ message: "Login successful" });
        } else {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/verify", async (req, res) => {
    try {
      // Query to select data from Verify table with corresponding Users data
      const selectQuery = `
        SELECT Verify.*, Users.user_fname, Users.user_lname, Users.strand_name, Users.batch_year, Users.section_number
        FROM Verify
        JOIN Users ON Verify.user_Id = Users.user_ID
      `;

      // Execute the SQL query
      db.all(selectQuery, (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: err.message });
          return;
        }

        // Send the retrieved data back to the client
        res.status(200).json(rows);
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/verify-user-stat/:user_Id", async (req, res) => {
    try {
      const { user_Id } = req.params;

      // Query to fetch vstat for the specified user_Id
      const query = "SELECT vstat FROM Verify WHERE user_Id = ?";

      // Execute the SQL query
      const result = await db.get(query, [user_Id]);

      if (!result) {
        return res.status(404).json({
          error: "Verification not found",
          message: "No verification found for the specified user ID",
        });
      }

      // Respond with the vstat value
      res.json({ vstat: result.vstat });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Internal Server Error", message: error.message });
    }
  });

  router.get("/verify-user/:userId", (req, res) => {
    const userId = req.params.userId;

    db.get(
      "SELECT COALESCE(vstat, 0) AS vstat, * FROM Verify WHERE user_Id = ?",
      [userId],
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
        }

        if (!result) {
          return res.status(404).json({
            error: "Verification not found",
            message: "No verification found for the specified user ID",
          });
        }

        res.json(result);
      }
    );
  });

  router.patch("/verify/:user_Id", async (req, res) => {
    try {
      const { user_Id } = req.params;
      const { vstat } = req.body;

      // Check if vstat is provided in the request body
      if (vstat === undefined) {
        return res
          .status(400)
          .json({ error: "Missing 'vstat' field in the request body" });
      }

      // Update vstat in the Verify table
      const updateQuery = `
        UPDATE Verify
        SET vstat = ?
        WHERE user_Id = ?
      `;

      // Execute the SQL query
      await db.run(updateQuery, [vstat, user_Id]);

      // Send a response back to the client
      res.status(200).json({ message: "vstat updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
  router.post("/verify-user/:userId", (req, res) => {
    const { userId } = req.params;
    const { uname, pword, contact } = req.body;
    db.run(
      "INSERT INTO Verify (user_Id, date_verified, uname, pword, contact, vstat) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?)",
      [userId, uname, pword, contact],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
        }

        res.json({ message: "User verified successfully" });
      }
    );
  });

  router.get("/verified-users/count", (_, res) => {
    db.get(
      "SELECT COUNT(V.user_Id) AS totalVerifiedUsers FROM Verify V INNER JOIN Users U ON V.user_Id = U.user_ID WHERE V.vstat = 1",
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Internal Server Error", message: err.message });
        }

        if (!result || result.totalVerifiedUsers === undefined) {
          return res.status(404).json({
            error: "Verified users not found",
            message: "No verified users found in the database",
          });
        }

        const totalVerifiedUsers = result.totalVerifiedUsers;

        res.json({ totalVerifiedUsers });
      }
    );
  });

  router.post("/users", async (req, res) => {
    const {
      userType = "Alumna",
      firstName,
      lastName,
      midName,
      suffix,
      batch,
      strand,
      section,
      cnumber,
      address,
      email,
    } = req.body;

    console.log(req.body);

    const userId = uuid();

    try {
      await db.run(
        `
        INSERT INTO Users (
          user_Id, 
          user_type_role, 
          user_fname, 
          user_lname, 
          user_mname, 
          user_suffix, 
          batch_year, 
          strand_name, 
          section_number, 
          cnumber, 
          address,
          email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          userId,
          userType,
          firstName,
          lastName,
          midName,
          suffix,
          batch,
          strand,
          section,
          cnumber,
          address,
          email,
        ]
      );

      res.status(201).json({
        userId,
        userType,
        firstName,
        lastName,
        midName,
        suffix,
        batch,
        strand,
        section,
        cnumber,
        address,
        email,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/users/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
      const getUserQuery = "SELECT * FROM Users WHERE user_ID = ?";
      db.get(getUserQuery, [userId], function (err, userData) {
        if (err) {
          console.error("Error fetching user data:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (!userData) {
          return res.status(404).json({ error: "User not found" });
        }

        const formattedUserData = {
          user_ID: userData.user_ID,
          user_type_role: userData.user_type_role,
          user_fname: userData.user_fname,
          user_lname: userData.user_lname,
          user_mname: userData.user_mname,
          user_suffix: userData.user_suffix,
          batch_year: userData.batch_year,
          strand_name: userData.strand_name,
          section_number: userData.section_number,
          address: userData.address,
          email: userData.email,
          cnumber: userData.cnumber,
        };

        res.status(200).json(formattedUserData);
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/users/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
      await db.run("DELETE FROM Users WHERE user_ID = ?", [userId]);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/user-types", (req, res) => {
    db.all("SELECT * FROM UserType", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  router.get("/batch", (req, res) => {
    db.all("SELECT * FROM Batch", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res
        .status(200)
        .json({ data: rows || [], message: "Successfully fetched!" });
    });
  });

  router.get("/batch_years", (_, res) => {
    db.all("SELECT DISTINCT batch_year FROM Batch", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      const batchYears = rows.map((row) => row.batch_year);
      res.status(200).json({ batchYears });
    });
  });

  router.post("/batch", async (req, res) => {
    try {
      const { year } = req.body;

      if (!year) {
        return res.status(400).json({ error: "Year is required" });
      }

      const result = await db.run("INSERT INTO Batch (batch_year) VALUES (?)", [
        year,
      ]);

      if (result.lastID) {
        return res
          .status(201)
          .json({ success: true, batch_number: result.lastID });
      } else {
        return res.status(500).json({ error: "Failed to add new batch" });
      }
    } catch (error) {
      console.error("Error adding new batch:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/strands", (req, res) => {
    db.all("SELECT * FROM Strand", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  router.get("/alumna-count-by-strand", (req, res) => {
    db.all(
      "SELECT strand_name, COUNT(user_ID) as alumnaCount FROM Users WHERE user_type_role = 'Alumna' GROUP BY strand_name",
      (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
        res.json(rows);
      }
    );
  });

  router.post("/strand", async (req, res) => {
    const { strand } = req.body;

    try {
      if (!strand) {
        return res.status(400).json({ error: "Strand name is required" });
      }

      const result = await db.run(
        "INSERT INTO Strand (strand_name) VALUES (?)",
        [strand]
      );
      if (result.lastID) {
        return res
          .status(201)
          .json({ success: true, strand_number: result.lastID });
      } else {
        return res.status(500).json({ error: "Failed to add new strand" });
      }
    } catch (error) {
      console.error("Error adding new strand:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/sections", (req, res) => {
    db.all("SELECT * FROM Sections", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  router.post("/strands", async (req, res) => {
    const { strand } = req.body;
    try {
      await db.run("INSERT INTO Strand (strand_name) VALUES (?)", [strand]);
      res.status(201).json({
        strand,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/posts/user/:userId", (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({ error: "Invalid user ID parameter" });
      return;
    }

    const query = `
      SELECT
        Posts.post_number,
        Posts.post_type,
        Posts.supp,
        Posts.post_content,
        Posts.date_post,
        Users.user_fname,
        Users.user_lname,
        Users.user_mname,
        Users.user_suffix,
        Users.batch_year
      FROM
        Posts
      LEFT JOIN
        Users ON Posts.user_ID = Users.user_ID
      WHERE
        Users.user_ID = ?`;

    db.all(query, [userId], (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (rows.length === 0) {
        res
          .status(404)
          .json({ error: "No posts found for the specified user" });
        return;
      }

      const user = {
        user_fname: rows[0].user_fname,
        user_lname: rows[0].user_lname,
        user_mname: rows[0].user_mname,
        user_suffix: rows[0].user_suffix,
        batch_year: rows[0].batch_year,
      };

      const posts = rows.map((row) => ({
        post_number: row.post_number,
        post_type: row.post_type,
        supp: row.supp,
        post_content: row.post_content,
        date_post: row.date_post,
      }));

      try {
        // Attempt to send JSON response
        res.json({ user, posts });
      } catch (jsonError) {
        console.error(jsonError);
        res.status(500).json({ error: "Error formatting JSON response" });
      }
    });
  });
  router.delete("/posts/:postNumber", async (req, res) => {
    const postNumber = req.params.postNumber;

    if (!postNumber) {
      res.status(400).json({ error: "Invalid post number parameter" });
      return;
    }

    const query = `
      DELETE FROM Posts
      WHERE post_number = ?`;

    db.run(query, [postNumber], function (err) {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Post not found" });
      } else {
        res.json({ success: true, message: "Post deleted successfully" });
      }
    });
  });

  router.get("/posts", (req, res) => {
    // Fetch all posts
    const query = `
      SELECT Posts.post_number, Posts.post_type, Posts.supp, Posts.post_content, Posts.date_post, Users.user_fname, Users.user_lname, Users.user_mname, Users.user_suffix, Users.batch_year
      FROM Posts
      LEFT JOIN Users ON Posts.user_ID = Users.user_ID
    `;

    db.all(query, (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }

      if (rows.length === 0) {
        res.status(404).json({ error: "No posts found" });
        return;
      }

      const posts = rows.map((row) => ({
        post_number: row.post_number,
        post_type: row.post_type,
        supp: row.supp,
        post_content: row.post_content,
        date_post: new Date(row.date_post).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        user: {
          user_fname: row.user_fname,
          user_lname: row.user_lname,
          user_mname: row.user_mname,
          user_suffix: row.user_suffix,
          batch_year: row.batch_year,
        },
      }));

      res.json({ posts });
    });
  });

  router.post("/posts/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const { post_content } = req.body;

    if (!userId || !post_content) {
      res.status(400).json({ error: "Invalid request parameters" });
      return;
    }

    const date_post = new Date().toISOString(); // You may want to customize the date format based on your requirements

    db.run(
      "INSERT INTO Posts (user_ID, post_type, post_content, date_post) VALUES (?, ?, ?, ?)",
      [userId, "Social", post_content, date_post], // Set post_type to "Social" by default
      function (err) {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }

        const postNumber = this.lastID;

        res.json({ post_number: postNumber, date_post });
      }
    );
  });

  router.post("/sections", async (req, res) => {
    const { section } = req.body;
    try {
      await db.run("INSERT INTO Sections (section_number) VALUES (?)", [
        section,
      ]);
      res.status(201).json({
        section,
      });
    } catch (error) {
      console.error(error);
      res.status(500);
    }
  });

  return router;
};
