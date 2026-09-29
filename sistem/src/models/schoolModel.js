
const { db } = require("../database/db");
const crypto = require("crypto");

class SchoolModel {
    static async findById(id) {
    if (!id) return null;
    return await db.get("SELECT * FROM schools WHERE id = ?", [id]);
  }

    static async findAll() {
    return await db.all("SELECT * FROM schools ORDER BY schoolName ASC");
  }

    static async create(schoolData) {
    const { schoolName, address } = schoolData;

    const result = await db.run(
      "INSERT INTO schools (schoolName, address) VALUES (?, ?)",
      [schoolName, address || ""]
    );

    return this.findById(result.insertId);
  }

    static async update(id, schoolData) {
    const { schoolName, address } = schoolData;
    await db.run(
      "UPDATE schools SET schoolName = ?, address = ? WHERE id = ?",
      [schoolName, address || "", id]
    );
    return this.findById(id);
  }

    static async delete(id) {
    await db.run("DELETE FROM schools WHERE id = ?", [id]);
  }
}

module.exports = SchoolModel;
