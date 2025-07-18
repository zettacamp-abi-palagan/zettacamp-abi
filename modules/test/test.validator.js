// *************** IMPORT CORE ***************
const mongoose = require('mongoose');

// *************** IMPORT LIBRARY ***************
const { ApolloError } = require('apollo-server');

/**
 * Validates the optional test_status input for fetching tests.
 * @param {string} [test_status] - Optional. The status of the tests to filter by (e.g., 'ACTIVE').
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateTestStatusFilter(test_status) {
    const validStatus = ['ACTIVE', 'INACTIVE'];

    if (!test_status) {
        return;
    }

    if (typeof test_status !== 'string' || !validStatus.includes(test_status.toUpperCase())) {
        throw new ApolloError(`Test status must be one of: ${validStatus.join(', ')}.`, 'BAD_USER_INPUT', {
            field: 'test_status'
        });
    }
}

/**
 * Validates the input object for creating or updating a test using a rule-based approach.
 * @param {object} args - The arguments for the validation.
 * @param {object} args.testInput - An object containing the test's properties to be validated.
 * @param {string} [args.testInput.name] - The name of the test.
 * @param {string} [args.testInput.description] - The description of the test.
 * @param {string} [args.testInput.test_type] - The type of the test.
 * @param {string} [args.testInput.result_visibility] - The visibility setting for the test results.
 * @param {number} [args.testInput.weight] - The weight of the test, must be between 0 and 1.
 * @param {string} [args.testInput.correction_type] - The correction method for the test.
 * @param {Array<object>} [args.testInput.notations] - The notation system used for the test.
 * @param {boolean} [args.testInput.is_retake] - Flag indicating if this is a retake test.
 * @param {string} [args.testInput.connected_test] - Optional. The ID of the original test, required if is_retake is true.
 * @param {string} [args.testInput.test_status] - Optional. The status of the test.
 * @param {object} [args.testInput.test_passing_criteria] - Optional. The criteria for passing the test.
 * @param {string} args.evaluationType - The evaluation type of the parent block.
 * @param {Array<object>} [args.existingNotations] - Optional. The existing notations from the test document, used for validating passing criteria on update.
 * @param {boolean} [args.isUpdate=false] - Optional flag to indicate if this is an update operation, which allows for partial data.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateTestInput({ testInput, evaluationType, existingNotations, isUpdate = false }) {
    const validTestType = ['FREE_CONTINUOUS_CONTROL', 'MEMMOIRE_ORAL_NON_JURY', 'MEMOIRE_ORAL', 'MEMOIRE_WRITTEN', 'MENTOR_EVALUATION', 'ORAL', 'WRITTEN'];
    const validResultVisibility = ['NEVER', 'AFTER_CORRECTION', 'AFTER_JURY_DECISION_FOR_FINAL_TRANSCRIPT'];
    const validCorrectionType = ['ADMTC', 'CERTIFIER', 'CROSS_CORRECTION', 'PREPARATION_CENTER'];
    const validStatus = ['ACTIVE', 'INACTIVE'];

    const validationRules = [
        {
            field: 'name',
            required: true,
            validate: (val) => typeof val === 'string' && val.trim() !== '',
            message: 'Name is required.',
        },
        {
            field: 'description',
            required: true,
            validate: (val) => typeof val === 'string' && val.trim() !== '',
            message: 'Description is required.',
        },
        {
            field: 'test_type',
            required: true,
            validate: (val) => typeof val === 'string' && validTestType.includes(val.toUpperCase()),
            message: `Test type must be one of: ${validTestType.join(', ')}.`,
        },
        {
            field: 'result_visibility',
            required: true,
            validate: (val) => typeof val === 'string' && validResultVisibility.includes(val.toUpperCase()),
            message: `Result visibility must be one of: ${validResultVisibility.join(', ')}.`,
        },
        {
            field: 'weight',
            required: true,
            validate: (val) => typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 1,
            message: 'Weight is required and must be a number between 0 and 1.',
        },
        {
            field: 'correction_type',
            required: true,
            validate: (val) => typeof val === 'string' && validCorrectionType.includes(val.toUpperCase()),
            message: `Correction type must be one of: ${validCorrectionType.join(', ')}.`,
        },
        {
            field: 'is_retake',
            required: true,
            validate: (val) => typeof val === 'boolean',
            message: 'is_retake must be a boolean.',
        },
        {
            field: 'test_status',
            required: false,
            validate: (val) => typeof val === 'string' && validStatus.includes(val.toUpperCase()),
            message: `Test status must be one of: ${validStatus.join(', ')}.`,
        },
    ];

    for (const rule of validationRules) {
        const value = testInput[rule.field];
        if ((!isUpdate && rule.required) || value !== undefined) {
            if (!rule.validate(value)) {
                throw new ApolloError(rule.message, 'BAD_USER_INPUT', { field: rule.field });
            }
        }
    }

    const { notations, is_retake, connected_test, test_type } = testInput;

    if ((!isUpdate) || notations !== undefined) {
        if (!Array.isArray(notations) || !notations.length) {
            throw new ApolloError('Notations must be a non-empty array.', 'BAD_USER_INPUT', { field: 'notations' });
        }

        for (const [index, notation] of notations.entries()) {
            const { notation_text, max_points } = notation;
            if (!notation_text || typeof notation_text !== 'string' || notation_text.trim() === '') {
                throw new ApolloError(`Notation at index ${index} must have non-empty text.`, 'BAD_USER_INPUT', { field: `notations[${index}].notation_text` });
            }
            if (typeof max_points !== 'number' || isNaN(max_points) || max_points < 0) {
                throw new ApolloError(`Notation at index ${index} must have a valid max_points (number ≥ 0).`, 'BAD_USER_INPUT', { field: `notations[${index}].max_points` });
            }
        }
    }

    if (is_retake) {
        if (!connected_test) {
            throw new ApolloError('connected_test is required when is_retake is true.', 'BAD_USER_INPUT', { field: 'connected_test' });
        }
        if (!mongoose.Types.ObjectId.isValid(connected_test)) {
            throw new ApolloError(`Invalid connected test ID: ${connected_test}`, "BAD_USER_INPUT", { field: 'connected_test' });
        }
    }

    if (test_type) {
        const competencyTestTypes = ['ORAL', 'WRITTEN', 'MEMOIRE_WRITTEN', 'FREE_CONTINUOUS_CONTROL', 'MENTOR_EVALUATION'];
        const scoreTestTypes = ['FREE_CONTINUOUS_CONTROL', 'MEMMOIRE_ORAL_NON_JURY', 'MEMOIRE_ORAL', 'MEMOIRE_WRITTEN', 'MENTOR_EVALUATION', 'ORAL', 'WRITTEN'];

        const upperTestType = test_type.toUpperCase();
        const isCompetencyMismatch = evaluationType === 'COMPETENCY' && !competencyTestTypes.includes(upperTestType);
        const isScoreMismatch = evaluationType === 'SCORE' && !scoreTestTypes.includes(upperTestType);

        if (isCompetencyMismatch || isScoreMismatch) {
            throw new ApolloError(`Test type '${upperTestType}' is not allowed for block with evaluation_type '${evaluationType}'.`, 'BAD_USER_INPUT', { field: 'test_type' });
        }
    }

    if (testInput.test_passing_criteria) {
        const notationsSource = testInput.notations || existingNotations;

        if (!notationsSource || !Array.isArray(notationsSource) || notationsSource.length === 0) {
            throw new ApolloError("Cannot validate 'test_passing_criteria' because no notations are available for this test.", 'BAD_USER_INPUT');
        }

        validateTestPassingCriteriaInput({
            testPassingCriteria: testInput.test_passing_criteria,
            notations: notationsSource
        });
    }
}

/**
 * Validates the top-level structure of a test's passing criteria object.
 * @param {object} args - The arguments for the validation.
 * @param {object} args.testPassingCriteria - The passing criteria object to validate.
 * @param {Array<object>} args.notations - An array of the test's notation objects to validate against.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function validateTestPassingCriteriaInput({ testPassingCriteria, notations }) {
    const { pass_criteria, fail_criteria } = testPassingCriteria;

    if (!pass_criteria && !fail_criteria) {
        throw new ApolloError(
            "Field 'test_passing_criteria' must contain at least one of 'pass_criteria' or 'fail_criteria'.",
            'BAD_USER_INPUT'
        );
    }

    const availableNotationTexts = new Set(notations.map(n => n.notation_text));

    if (pass_criteria) {
        validateTestCriteriaGroups({
            criteriaGroups: pass_criteria.test_criteria_groups,
            availableNotationTexts: availableNotationTexts,
            path: 'test_passing_criteria.pass_criteria.test_criteria_groups'
        });
    }

    if (fail_criteria) {
        validateTestCriteriaGroups({
            criteriaGroups: fail_criteria.test_criteria_groups,
            availableNotationTexts: availableNotationTexts,
            path: 'test_passing_criteria.fail_criteria.test_criteria_groups'
        });
    }
}

/**
 * Validates an array of criteria groups for a test's passing criteria.
 * @param {object} args - The arguments for the validation.
 * @param {Array<object>} args.criteriaGroups - The array of criteria groups to validate.
 * @param {Set<string>} args.availableNotationTexts - A Set of notation text strings that are valid for this test.
 * @param {string} args.path - The dot-notation path to the current groups array, used for error messages.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function validateTestCriteriaGroups({ criteriaGroups, availableNotationTexts, path }) {
    if (!Array.isArray(criteriaGroups) || criteriaGroups.length === 0) {
        throw new ApolloError(
            `Field '${path}' must be a non-empty array of criteria groups.`,
            'BAD_USER_INPUT'
        );
    }

    criteriaGroups.forEach((group, groupIndex) => {
        const groupPath = `${path}[${groupIndex}]`;
        if (!Array.isArray(group.conditions) || group.conditions.length === 0) {
            throw new ApolloError(
                `Field '${groupPath}.conditions' must be a non-empty array.`,
                'BAD_USER_INPUT'
            );
        }

        group.conditions.forEach((condition, condIndex) => {
            const conditionPath = `${groupPath}.conditions[${condIndex}]`;
            validateSingleNotationCondition({
                condition,
                availableNotationTexts,
                path: conditionPath
            });
        });
    });
}

/**
 * Validates a single, atomic condition object within a test's criteria group.
 * @param {object} args - The arguments for the validation.
 * @param {object} args.condition - The single condition object to validate.
 * @param {Set<string>} args.availableNotationTexts - A Set of valid notation texts to check against if criteria type is 'MARK'.
 * @param {string} args.path - The dot-notation path to the current condition, used for error messages.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function validateSingleNotationCondition({ condition, availableNotationTexts, path }) {
    const validCriteriaType = ['MARK', 'AVERAGE'];
    const validComparisonOperator = ['GTE', 'LTE', 'GT', 'LT', 'E'];

    if (
        typeof condition.criteria_type !== 'string' ||
        !validCriteriaType.includes(condition.criteria_type.toUpperCase())
    ) {
        throw new ApolloError(
            `Field '${path}.criteria_type' is required and must be one of: ${validCriteriaType.join(', ')}.`,
            'BAD_USER_INPUT'
        );
    }

    if (
        typeof condition.comparison_operator !== 'string' ||
        !validComparisonOperator.includes(condition.comparison_operator.toUpperCase())
    ) {
        throw new ApolloError(
            `Field '${path}.comparison_operator' is required and must be one of: ${validComparisonOperator.join(', ')}.`,
            'BAD_USER_INPUT'
        );
    }

    if (typeof condition.mark !== 'number' || condition.mark < 0) {
        throw new ApolloError(
            `Field '${path}.mark' is required and must be a number ≥ 0.`,
            'BAD_USER_INPUT'
        );
    }

    if (condition.criteria_type.toUpperCase() === 'MARK') {
        if (
            typeof condition.notation_text !== 'string' ||
            condition.notation_text.trim() === ''
        ) {
            throw new ApolloError(
                `Field '${path}.notation_text' is required and must be a non-empty string when 'criteria_type' is 'MARK'.`,
                'BAD_USER_INPUT'
            );
        }
        if (!availableNotationTexts.has(condition.notation_text)) {
            throw new ApolloError(
                `Value "${condition.notation_text}" in '${path}.notation_text' does not match any notation defined for this test.`,
                'BAD_USER_INPUT'
            );
        }
    }
}

/**
 * Validates the due dates for publishing a test.
 * @param {object} args - The arguments for the validation.
 * @param {Date|string} [args.assignCorrectorDueDate] - Optional. The due date for assigning a corrector.
 * @param {Date|string} [args.testDueDate] - Optional. The due date for the test.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidatePublishTestInput({ assignCorrectorDueDate, testDueDate }) {
    if (assignCorrectorDueDate && isNaN(new Date(assignCorrectorDueDate).getTime())) {
        throw new ApolloError('A valid date format is required for assign_corrector_due_date.', 'BAD_USER_INPUT', {
            field: 'assign_corrector_due_date'
        });
    }
    if (testDueDate && isNaN(new Date(testDueDate).getTime())) {
        throw new ApolloError('A valid date format is required for test_due_date.', 'BAD_USER_INPUT', {
            field: 'test_due_date'
        });
    }
}

/**
 * Validates the inputs for the SubjectLoader resolver on the Test type.
 * @param {object} test - The parent test object, which must contain a 'subject' property with a valid ObjectID.
 * @param {object} context - The GraphQL context, which must contain a configured SubjectLoader.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateSubjectLoaderInput(test, context) {
    if (!test || typeof test !== 'object' || test === null) {
        throw new ApolloError('Input error: test must be a valid object.', 'BAD_USER_INPUT', {
            field: 'test'
        });
    }

    if (!mongoose.Types.ObjectId.isValid(test.subject)) {
        throw new ApolloError('Input error: test.subject must be a valid ID.', 'BAD_USER_INPUT', {
            field: 'test.subject'
        });
    }

    if (
        !context ||
        !context.dataLoaders ||
        !context.dataLoaders.SubjectLoader ||
        typeof context.dataLoaders.SubjectLoader.load !== 'function'
    ) {
        throw new ApolloError('Server configuration error: SubjectLoader with load function not found on context.', 'INTERNAL_SERVER_ERROR');
    }
}

/**
 * Validates the inputs for the StudentTestResultLoader resolver.
 * @param {object} test - The parent test object, which must contain a 'student_test_results' array of valid ObjectIDs.
 * @param {object} context - The GraphQL context, which must contain a configured StudentTestResultLoader.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateStudentTestResultLoaderInput(test, context) {
    if (!test || typeof test !== 'object' || test === null) {
        throw new ApolloError('Input error: test must be a valid object.', 'BAD_USER_INPUT', {
            field: 'test'
        });
    }

    if (!Array.isArray(test.student_test_results)) {
        throw new ApolloError('Input error: test.student_test_results must be an array.', 'BAD_USER_INPUT', {
            field: 'test.student_test_results'
        });
    }

    for (const resultId of test.student_test_results) {
        if (!mongoose.Types.ObjectId.isValid(resultId)) {
            throw new ApolloError(`Invalid ID found in student_test_results array: ${resultId}`, 'BAD_USER_INPUT', {
                field: 'test.student_test_results'
            });
        }
    }

    if (
        !context ||
        !context.dataLoaders ||
        !context.dataLoaders.StudentTestResultLoader ||
        typeof context.dataLoaders.StudentTestResultLoader.loadMany !== 'function'
    ) {
        throw new ApolloError('Server configuration error: StudentTestResultLoader with loadMany function not found on context.', 'INTERNAL_SERVER_ERROR');
    }
}

/**
 * Validates the inputs for the TaskLoader resolver.
 * @param {object} test - The parent test object, which must contain a 'tasks' array of valid ObjectIDs.
 * @param {object} context - The GraphQL context, which must contain a configured TaskLoader.
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateTaskLoaderInput(test, context) {
    if (!test || typeof test !== 'object' || test === null) {
        throw new ApolloError('Input error: test must be a valid object.', 'BAD_USER_INPUT', {
            field: 'test'
        });
    }

    if (!Array.isArray(test.tasks)) {
        throw new ApolloError('Input error: test.tasks must be an array.', 'BAD_USER_INPUT', {
            field: 'test.tasks'
        });
    }

    for (const taskId of test.tasks) {
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            throw new ApolloError(`Invalid ID found in tasks array: ${taskId}`, 'BAD_USER_INPUT', {
                field: 'test.tasks'
            });
        }
    }

    if (
        !context ||
        !context.dataLoaders ||
        !context.dataLoaders.TaskLoader ||
        typeof context.dataLoaders.TaskLoader.loadMany !== 'function'
    ) {
        throw new ApolloError('Server configuration error: TaskLoader with loadMany function not found on context.', 'INTERNAL_SERVER_ERROR');
    }
}

/**
 * Validates the inputs for resolvers that use the UserLoader.
 * @param {object} parent - The parent object.
 * @param {object} context - The GraphQL context, which must contain a configured UserLoader.
 * @param {string} fieldName - The name of the property on the block object that holds the user ID (e.g., 'created_by').
 * @returns {void} - This function does not return a value but throws an error if validation fails.
 */
function ValidateUserLoaderInput(parent, context, fieldName) {
    if (!parent || typeof parent !== 'object' || parent === null) {
        throw new ApolloError('Input error: parent must be a valid object.', 'BAD_USER_INPUT');
    }

    if (
        !context ||
        !context.dataLoaders ||
        !context.dataLoaders.UserLoader ||
        typeof context.dataLoaders.UserLoader.load !== 'function'
    ) {
        throw new ApolloError('Server configuration error: UserLoader not found on context.', 'INTERNAL_SERVER_ERROR');
    }

    const userId = parent[fieldName];

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApolloError(`Input error: If provided, parent.${fieldName} must be a valid ID.`, 'BAD_USER_INPUT');
    }
}

// *************** EXPORT MODULE ***************
module.exports = {
    ValidateTestStatusFilter,
    ValidateTestInput,
    ValidatePublishTestInput,
    ValidateSubjectLoaderInput,
    ValidateStudentTestResultLoaderInput,
    ValidateTaskLoaderInput,
    ValidateUserLoaderInput
};