const express = require("express");
const { uuid } = require("uuidv4");
const router = express.Router();

module.exports.setupRoutes = (db) => {
  router.get("/users", (req, res) => {
    const { strand_name, section_number, batch_year } = req.query;

    // Modify the SQL query accordingly to filter by strand_name, section_number, and batch_year
    const sqlQuery = `
      SELECT * FROM Users
      WHERE section_number = ? AND batch_year = ?
    `;

    db.all(sqlQuery, [section_number, batch_year], (err, rows) => {
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
    const { bnumber, year, strand } = req.body;
    try {
      await db.run(
        "INSERT INTO Batch (batch_number, batch_year, strand_number) VALUES (?, ?, ?)",
        [bnumber, year, strand]
      );
      res.status(201).json({
        bnumber,
        year,
        strand,
      });
    } catch (error) {
      console.error(error);
      res.status(500);
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
