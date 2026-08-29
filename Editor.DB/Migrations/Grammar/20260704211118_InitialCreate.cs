#nullable disable

using Editor.Domain.Grammar;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Editor.DB.Grammar
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "forms",
                columns: table => new
                {
                    normalized_form = table.Column<string>(type: "text", nullable: false),
                    paradigm_id = table.Column<int>(type: "integer", nullable: false),
                    variant_id = table.Column<string>(type: "text", nullable: false),
                    form_tag = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_forms", x => new { x.normalized_form, x.paradigm_id, x.variant_id, x.form_tag });
                });

            migrationBuilder.CreateTable(
                name: "paradigms",
                columns: table => new
                {
                    paradigm_id = table.Column<int>(type: "integer", nullable: false),
                    lemma = table.Column<string>(type: "text", nullable: false),
                    tag = table.Column<string>(type: "text", nullable: false),
                    meaning = table.Column<string>(type: "text", nullable: true),
                    variants = table.Column<List<ParadigmVariant>>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_paradigms", x => x.paradigm_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "forms");

            migrationBuilder.DropTable(
                name: "paradigms");
        }
    }
}
