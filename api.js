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
    if (!Boolean(search.trim())) {
      return res.json([]);
    }
    sqlQuery +=
      " AND (user_fname LIKE ? OR user_lname LIKE ? OR username LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);

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

  router.get("/verified-users/count", (_, res) => {
    db.get(
      "SELECT COUNT(user_ID) AS totalVerifiedUsers FROM Users WHERE verified = 1",
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

  // New route for fetching user registration data
  router.get("/user-registration-chart-data", (req, res) => {
    const sqlQuery =
      "SELECT reg_date, COUNT(*) as total_users FROM Users GROUP BY reg_date";

    return db.all(sqlQuery, (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
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
      username,
      pword,
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
          username, 
          password,
          address,
          email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          username,
          pword,
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
        username,
        pword,
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
      const getUserQuery = "SELECT * FROM Users WHERE user_Id = ?";
      db.get(getUserQuery, [String(userId)], function (err, userData) {
        if (err) {
          console.error("Error fetching user data:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        if (!userData) {
          return res.status(404).json({ error: "User not found" });
        }

        const formattedUserData = {
          user_ID: userData.user_Id,
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
          contact_number: userData.cnumber,
          verified: userData.verified,
        };

        res.status(200).json(formattedUserData);
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal server error" });
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

    db.all(
      "SELECT Posts.post_number, Posts.post_type, Posts.supp, Posts.post_content, Posts.date_post, Users.user_fname, Users.user_lname, Users.user_mname, Users.user_suffix, Users.batch_year FROM Posts LEFT JOIN Users ON Posts.user_ID = Users.user_ID WHERE Users.user_ID = ?",
      [userId],
      (err, rows) => {
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

        res.json({ user, posts });
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

  router.get("/image-attributes", (req, res) => {
    db.all("SELECT * FROM ImageAttributes", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  router.get("/images", (req, res) => {
    db.all("SELECT * FROM Images", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
  });

  return router;
};
