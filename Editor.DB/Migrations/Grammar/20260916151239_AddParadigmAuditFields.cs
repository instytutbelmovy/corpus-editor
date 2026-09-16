using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Editor.DB.Migrations.Grammar
{
    /// <inheritdoc />
    public partial class AddParadigmAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "paradigms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "created_by",
                table: "paradigms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "modified_at",
                table: "paradigms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "modified_by",
                table: "paradigms",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "created_at",
                table: "paradigms");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "paradigms");

            migrationBuilder.DropColumn(
                name: "modified_at",
                table: "paradigms");

            migrationBuilder.DropColumn(
                name: "modified_by",
                table: "paradigms");
        }
    }
}
