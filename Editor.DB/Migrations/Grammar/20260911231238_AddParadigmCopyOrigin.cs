using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Editor.DB.Migrations.Grammar
{
    /// <inheritdoc />
    public partial class AddParadigmCopyOrigin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "copied_from_paradigm_id",
                table: "paradigms",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "copied_from_paradigm_id",
                table: "paradigms");
        }
    }
}
