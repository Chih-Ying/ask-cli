const { expect } = require('chai');
const fs = require('fs-extra');
const path = require('path');
const sinon = require('sinon');

const gitClient = require('@src/clients/git-client');
const SkillInfrastructureController = require('@src/controllers/skill-infrastructure-controller');
const ResourcesConfig = require('@src/model/resources-config');
const helper = require('@src/commands/v2new/helper');
const Manifest = require('@src/model/manifest');
const stringUtils = require('@src/utils/string-utils');

describe('Commands new test - helper test', () => {
    const FIXTURE_RESOURCES_CONFIG_FILE_PATH = path.join(process.cwd(), 'test', 'unit', 'fixture', 'model', 'resources-config.json');
    const FIXTURE_MANIFEST_FILE_PATH = path.join(process.cwd(), 'test', 'unit', 'fixture', 'model', 'manifest.json');

    const TEST_PROFILE = 'default';
    const TEST_DO_DEBUG = false;
    const TEST_INFRA_PATH = 'infraPath';
    const TEST_TEMPLATE_URL = 'value';
    const TEST_SKILL_FOLDER_NAME = 'skillFolderName';
    const TEST_SKILL_NAME = 'skillName';
    const TEST_SKIP_DEPLOY_DELEGATE = 'deploy skill infrastructure manually';
    const TEST_USER_INPUT = {
        skillName: 'testName',
        projectFolderName: 'projectName',
        templateInfo: {
            templateUrl: TEST_TEMPLATE_URL
        }
    };

    describe('# test helper method - initializeDeployDelegate', () => {
        beforeEach(() => {
            new ResourcesConfig(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
        });

        afterEach(() => {
            ResourcesConfig.dispose();
            sinon.restore();
        });

        it('| ui select deploy delegate pass and selection is opt-out, expect quit process', (done) => {
            // setup
            // call
            helper.initializeDeployDelegate(TEST_SKIP_DEPLOY_DELEGATE, TEST_INFRA_PATH, TEST_PROFILE, TEST_DO_DEBUG, (err, res) => {
                // verify
                expect(res).equal(undefined);
                expect(err).equal(undefined);
                done();
            });
        });

        it('| bootstrap fails, expect throw error', (done) => {
            // setup
            const TEST_SELECTED_TYPE = '@ask-cli/test!!!@ ';
            sinon.stub(fs, 'ensureDirSync');
            sinon.stub(SkillInfrastructureController.prototype, 'bootstrapInfrastructures').callsArgWith(1, 'error');
            // call
            helper.initializeDeployDelegate(TEST_SELECTED_TYPE, TEST_INFRA_PATH, TEST_PROFILE, TEST_DO_DEBUG, (err, res) => {
                // verify
                expect(fs.ensureDirSync.args[0][0]).equal(path.join(TEST_INFRA_PATH, 'infrastructure/test'));
                expect(res).equal(undefined);
                expect(err).equal('error');
                done();
            });
        });

        it('| bootstrap pass, expect return deployType', (done) => {
            // setup
            const TEST_SELECTED_TYPE = '  !!!test^^^  ';
            sinon.stub(fs, 'ensureDirSync');
            sinon.stub(SkillInfrastructureController.prototype, 'bootstrapInfrastructures').callsArgWith(1);
            // call
            helper.initializeDeployDelegate(TEST_SELECTED_TYPE, TEST_INFRA_PATH, TEST_PROFILE, TEST_DO_DEBUG, (err, res) => {
                // verify
                expect(fs.ensureDirSync.args[0][0]).equal(path.join(TEST_INFRA_PATH, 'infrastructure/test'));
                expect(res).equal(TEST_SELECTED_TYPE);
                expect(err).equal(null);
                done();
            });
        });
    });

    describe('# test helper method - downloadTemplateFromGit', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('| git glient fail, expect throws error', (done) => {
            // setup
            const TEST_FOLDER_PATH = 'TEST_FOLDER_PATH';
            sinon.stub(path, 'join').returns(TEST_FOLDER_PATH);
            sinon.stub(gitClient, 'clone').callsArgWith(3, 'error');
            // call
            helper.downloadTemplateFromGit(TEST_USER_INPUT, (err, res) => {
                // verify
                expect(gitClient.clone.args[0][0]).equal(TEST_TEMPLATE_URL);
                expect(res).equal(undefined);
                expect(err).equal('error');
                done();
            });
        });

        it('| git clone pass, expect return folder path', (done) => {
            // setup
            const TEST_FOLDER_PATH = 'TEST_FOLDER_PATH';
            sinon.stub(path, 'join').returns(TEST_FOLDER_PATH);
            sinon.stub(gitClient, 'clone').callsArgWith(3, null);
            // call
            helper.downloadTemplateFromGit(TEST_USER_INPUT, (err, res) => {
                // verify
                expect(gitClient.clone.args[0][0]).equal(TEST_TEMPLATE_URL);
                expect(res).equal(TEST_FOLDER_PATH);
                expect(err).equal(null);
                done();
            });
        });
    });

    describe('# test helper method - loadSkillProjectModel', () => {
        beforeEach(() => {
        });

        afterEach(() => {
            sinon.restore();
        });

        it('| new resources config fails, expect throw error', () => {
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e.message).equal(`File ${TEST_SKILL_FOLDER_NAME}${path.sep}ask-resources.json not exists.`);
            }
        });

        it('| skill metadata src does not exist, expect throw error', () => {
            // setup
            sinon.stub(path, 'join').withArgs(TEST_SKILL_FOLDER_NAME, 'ask-resources.json').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(false);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e.message).equal('[Error]: Invalid skill project structure. Please set the "src" field in skillMetada resource.');
            }
        });

        it('| skill meta src is absolue & skill package src does not exist, expect throw error', () => {
            // setup
            sinon.stub(path, 'join').withArgs(TEST_SKILL_FOLDER_NAME, 'ask-resources.json').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(true);
            sinon.stub(path, 'isAbsolute').returns(true);
            sinon.stub(fs, 'existsSync').returns(false);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e.message).equal(`[Error]: Invalid skill package src. Attempt to get the skill package but doesn't exist: \
${ResourcesConfig.getInstance().getSkillMetaSrc(TEST_PROFILE)}.`);
            }
        });

        it('| skill meta src is not absolue & skill package src does not exist, expect throw error', () => {
            // setup
            sinon.stub(path, 'join').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(true);
            sinon.stub(path, 'isAbsolute').returns(false);
            sinon.stub(fs, 'existsSync').returns(false);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e.message).equal(`[Error]: Invalid skill package src. Attempt to get the skill package but doesn't exist: \
${FIXTURE_RESOURCES_CONFIG_FILE_PATH}.`);
            }
        });

        it('| skill package manifest file does not exist, expect throw error', () => {
            // setup
            sinon.stub(path, 'join');
            sinon.stub(fs, 'existsSync');
            path.join.withArgs(TEST_SKILL_FOLDER_NAME, 'ask-resources.json').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(true);
            sinon.stub(path, 'isAbsolute').returns(true);
            fs.existsSync.withArgs('./skillPackage').returns(true);
            path.join.withArgs('./skillPackage', 'skill.json').returns(FIXTURE_MANIFEST_FILE_PATH);
            fs.existsSync.withArgs(FIXTURE_MANIFEST_FILE_PATH).returns(false);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify FIXTURE_MANIFEST_FILE_PATH
                expect(e.message).equal('[Error]: Invalid skill project structure. Please make sure skill.json exists in ./skillPackage.');
            }
        });

        it('| new manifest file fails, expect throw error', () => {
            // setup
            sinon.stub(path, 'join');
            sinon.stub(fs, 'existsSync');
            path.join.withArgs(TEST_SKILL_FOLDER_NAME, 'ask-resources.json').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(true);
            sinon.stub(path, 'isAbsolute').returns(true);
            fs.existsSync.withArgs('./skillPackage').returns(true);
            path.join.withArgs('./skillPackage', 'skill.json').returns('invalidPath');
            fs.existsSync.withArgs('invalidPath').returns(true);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e.message).equal('File invalidPath not exists.');
            }
        });

        it('| skill package structure passes the validation, expect no error', () => {
            // setup
            sinon.stub(path, 'join');
            sinon.stub(fs, 'existsSync');
            path.join.withArgs(TEST_SKILL_FOLDER_NAME, 'ask-resources.json').returns(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            sinon.stub(stringUtils, 'isNonBlankString').returns(true);
            sinon.stub(path, 'isAbsolute').returns(true);
            fs.existsSync.withArgs('./skillPackage').returns(true);
            path.join.withArgs('./skillPackage', 'skill.json').returns(FIXTURE_MANIFEST_FILE_PATH);
            fs.existsSync.withArgs(FIXTURE_MANIFEST_FILE_PATH).returns(true);
            // call
            try {
                helper.loadSkillProjectModel(TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            } catch (e) {
                // verify
                expect(e).equal(undefined);
            }
        });
    });

    describe('# test helper method - updateSkillProjectWithUserSettings', () => {
        beforeEach(() => {
            new ResourcesConfig(FIXTURE_RESOURCES_CONFIG_FILE_PATH);
            new Manifest(FIXTURE_MANIFEST_FILE_PATH);
        });

        afterEach(() => {
            Manifest.dispose();
            ResourcesConfig.dispose();
            sinon.restore();
        });

        it('| expect refresh skill project to update skill name and remove .git folder', () => {
            // setup
            sinon.stub(fs, 'removeSync');
            // call
            helper.updateSkillProjectWithUserSettings(TEST_SKILL_NAME, TEST_SKILL_FOLDER_NAME, TEST_PROFILE);
            // verify
            expect(Manifest.getInstance().getSkillName()).equal(TEST_SKILL_NAME);
            expect(ResourcesConfig.getInstance().getProfile(TEST_PROFILE)).not.equal(null);
            expect(fs.removeSync.args[0][0]).equal(path.join(TEST_SKILL_FOLDER_NAME, '.git'));
        });
    });
});
