using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Editor.DB.Migrations.Grammar
{
    /// <inheritdoc />
    public partial class AddGrammarSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "lemma_normalized",
                table: "paradigms",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_paradigms_lemma_normalized",
                table: "paradigms",
                column: "lemma_normalized")
                .Annotation("Npgsql:IndexOperators", new[] { "text_pattern_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_forms_normalized_form",
                table: "forms",
                column: "normalized_form")
                .Annotation("Npgsql:IndexOperators", new[] { "text_pattern_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_paradigms_lemma_normalized",
                table: "paradigms");

            migrationBuilder.DropIndex(
                name: "ix_forms_normalized_form",
                table: "forms");

            migrationBuilder.DropColumn(
                name: "lemma_normalized",
                table: "paradigms");
        }
    }
}
