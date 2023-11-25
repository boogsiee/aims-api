const express = require("express");
const { uuid } = require("uuidv4");
const router = express.Router();

module.exports.setupRoutes = (db) => {
  router.get("/users", (_, res) => {
    db.all("SELECT * FROM Users", (err, rows) => {
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
      userType,
      firstName,
      lastName,
      midName,
      suffix,
      cnumber,
      username,
      pword,
      age,
    } = req.body;
    const userId = uuid();

    try {
      await db.run(
        "INSERT INTO Users (user_Id, user_type_role, user_fname, user_lname, user_mname, user_suffix, cnumber, username, password, age) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          userType,
          firstName,
          lastName,
          midName,
          suffix,
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
        cnumber,
        pword,
        age,
      });
    } catch (error) {
      console.error(error);
      res.status(500);
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

  router.get("/batch", (_, res) => {
    db.all("SELECT * FROM Batch", (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res
        .status(200)
        .json({ data: rows || [], message: "Sucessfully fetched!" });
    });
  });

  router.post("/batch", async (req, res) => {
    const { year } = req.body;
    try {
      await db.run("INSERT INTO Batch (year) VALUES (?)", [year]);
      res.status(201).json({
        year,
      });
    } catch (error) {
      console.error(error);
      res.status(500);
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

  router.get("/strands", (req, res) => {
    db.all("SELECT * FROM Strands", (err, rows) => {
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
