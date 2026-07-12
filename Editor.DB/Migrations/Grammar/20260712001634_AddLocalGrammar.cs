using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Editor.Migrations.Grammar
{
    /// <inheritdoc />
    public partial class AddLocalGrammar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "local_paradigm_id_seq",
                startValue: 1000000000L);

            migrationBuilder.AddColumn<int>(
                name: "source",
                table: "paradigms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "source",
                table: "forms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "hidden_paradigms",
                columns: table => new
                {
                    paradigm_id = table.Column<int>(type: "integer", nullable: false),
                    hidden_by = table.Column<string>(type: "text", nullable: true),
                    hidden_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hidden_paradigms", x => x.paradigm_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hidden_paradigms");

            migrationBuilder.DropColumn(
                name: "source",
                table: "paradigms");

            migrationBuilder.DropColumn(
                name: "source",
                table: "forms");

            migrationBuilder.DropSequence(
                name: "local_paradigm_id_seq");
        }
    }
}
