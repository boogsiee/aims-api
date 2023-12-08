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
      const sqlQuery = "SELECT * FROM Users";

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
    if (search) {
      sqlQuery +=
        " AND (user_fname LIKE ? OR user_lname LIKE ? OR username LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
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
      age,
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
          age
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          age,
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
          batch_number: userData.batch_number,
          strand_number: userData.strand_number,
          section_number: userData.section_number,
        };

        res.status(200).json(formattedUserData);
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/users/:userId", async (req, res) => {
    const userId = req.params.userId;
    const {
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
      age,
    } = req.body;

    try {
      // Check if the user with the given ID exists
      const existingUser = await db.get(
        "SELECT * FROM Users WHERE user_ID = ?",
        [userId]
      );

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Perform the update
      await db.run(
        `
        UPDATE Users
        SET user_type_role = ?,
            user_fname = ?,
            user_lname = ?,
            user_mname = ?,
            user_suffix = ?,
            batch_year = ?,
            strand_name = ?,
            section_number = ?,
            cnumber = ?,
            username = ?,
            password = ?,
            age = ?
        WHERE user_ID = ?
      `,
        [
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
          age,
          userId,
        ]
      );

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

      // Validate the input data (you may add more validation as needed)
      if (!year) {
        return res.status(400).json({ error: "Year is required" });
      }

      // Insert new batch into the Batch table
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
  router.post("/strand", async (req, res) => {
    const { strand } = req.body;

    try {
      // Check if the strand name is provided in the request body
      if (!strand) {
        return res.status(400).json({ error: "Strand name is required" });
      }

      // Insert the new strand into the database
      const result = await db.run(
        "INSERT INTO Strand (strand_name) VALUES (?)",
        [strand]
      );

      if (result.lastID) {
        // If the insertion is successful, return success and the strand number
        return res
          .status(201)
          .json({ success: true, strand_number: result.lastID });
      } else {
        // If the insertion fails, return an error
        return res.status(500).json({ error: "Failed to add new strand" });
      }
    } catch (error) {
      // Handle any unexpected errors
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

  router.get("/posts", (_, res) => {
    db.all("SELECT * FROM Posts", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json(rows);
    });
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

  router.post("/strands", async (req, res) => {
    const { strand } = req.body;
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
