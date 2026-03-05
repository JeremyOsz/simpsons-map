#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
output_dir <- if (length(args) >= 1) args[[1]] else ".data/thesimpsons"

if (!dir.exists(output_dir)) {
  dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
}

suppressPackageStartupMessages(library(thesimpsons))

data("script_lines", package = "thesimpsons")
data("episodes", package = "thesimpsons")

script_lines_path <- file.path(output_dir, "simpsons_script_lines.csv")
episodes_path <- file.path(output_dir, "simpsons_episodes.csv")

write.csv(script_lines, script_lines_path, row.names = FALSE, na = "")
write.csv(episodes, episodes_path, row.names = FALSE, na = "")

cat(sprintf("Exported:\n- %s\n- %s\n", script_lines_path, episodes_path))
