"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const mkdirp = require("mkdirp");
const path = require("path");
const _ = require("lodash");
const exec = require("child_process").exec;
const p = require("./src/prompts");
const getLicenseValue = require("./src/prompts").getLicenseValue;
const buildPackageJSON = require("./src/package-builder").buildPackageJSON;

module.exports = class extends Generator {
	initializing() {}

	prompting() {
		this.log(
			yosay(
				`Welcome to the groundbreaking ${chalk.red(
					"ansible-molecule"
				)} generator!`
			)
		);

		return this.prompt(p.allPrompts).then(props => {
			this.props = props;
			this.props.roleRoot = `./${this.props.roleName}`;
		});
	}

	configuring() {
		const roleRoot = `./${this.props.roleName}`;

		// CIRCLECI
		if (this.props.includeCircleCi) {
			mkdirp.sync(path.join(roleRoot, ".circleci"));
			this.fs.copy(
				this.templatePath(".circleci"),
				path.join(roleRoot, ".circleci")
			);
		}
	}

	default() {
		const roleRoot = `./${this.props.roleName}`;

		const filePaths = [
			{
				mkPath: roleRoot,
				src: this.templatePath("root-files"),
				dest: roleRoot
			},
			{
				src: this.templatePath("root-files/.**"),
				dest: roleRoot
			},
			{
				mkPath: path.join(roleRoot, "defaults"),
				src: this.templatePath("defaults"),
				dest: path.join(roleRoot, "defaults")
			},
			{
				mkPath: path.join(roleRoot, "defaults"),
				src: this.templatePath("handlers"),
				dest: path.join(roleRoot, "handlers")
			},
			{
				mkPath: path.join(roleRoot, "defaults"),
				src: this.templatePath("tasks"),
				dest: path.join(roleRoot, "tasks")
			},
			{
				mkPath: path.join(roleRoot, "defaults"),
				src: this.templatePath("vars"),
				dest: path.join(roleRoot, "vars")
			}
		];

		// Copying file paths
		filePaths.forEach(item => {
      if (item.mkPath !== undefined) mkdirp.sync(item.mkPath);
			this.fs.copy(item.src, item.dest);
		});
	}

	writing() {
		const roleRoot = `./${this.props.roleName}`;

		const templates = [
			{
				when: this.props.includeMolecule,
				mkPath: path.join(roleRoot, "molecule/default/tests"),
				tmpPath: this.templatePath("molecule/default/playbook.yml"),
				dest: path.join(roleRoot, "molecule/default/playbook.yml"),
				data: { roleName: this.props.roleName }
			},
			{
				tmpPath: this.templatePath("root-files/README.md"),
				dest: path.join(roleRoot, "README.md"),
				data: {
					roleName: this.props.roleName,
					authorName: this.props.gitAuthorName,
					authorEmail: this.props.gitAuthorEmail
				}
			},
			{
				tmpPath: this.templatePath("root-files/run-test.sh"),
				dest: path.join(roleRoot, "run-test.sh"),
				data: {
					roleName: this.props.roleName
				}
			},
			{
				when: this.props.includeMeta,
				tmpPath: this.templatePath("meta/main.yml"),
				dest: path.join(roleRoot, "meta/main.yml"),
				data: {
					authorName: this.props.gitAuthorName,
					description: this.props.description,
					metaCompany: this.props.metaCompany,
					metaLicence: getLicenseValue(this.props.license)
				}
			}
		];

		// Pre template tasks
		// MOLECULE
		if (this.props.includeMolecule) {
			this.fs.copy(
				this.templatePath("molecule"),
				path.join(roleRoot, "molecule")
			);
		}

		// Process templates
		templates.forEach(item => {
			if (item.when || item.when === undefined) {
				if (item.mkPath !== undefined) mkdirp.sync(item.mkPath);
				const template = _.template(this.fs.read(item.tmpPath));
				this.fs.write(item.dest, template(item.data));
			}
		});

		this.fs.writeJSON(
			path.join(roleRoot, "package.json"),
			buildPackageJSON(this.props)
		);
	}

	install() {
		// Fixing permissions
		exec(
			`chmod +x ${path.join(
				this.destinationRoot(),
				this.props.roleRoot,
				"run-test.sh"
			)}`
		);
	}

	end() {
		this.log(
			yosay(
				`All done! Created a new role called ${chalk.red(this.props.roleName)}!`
			)
		);
	}
};
