// *************** IMPORT LIBRARY ***************
const { ApolloError } = require('apollo-server');
const sgMail = require('@sendgrid/mail');

// *************** IMPORT MODULE *************** 
const TaskModel = require('./task.model');
const { SENDGRID_API_KEY, SENDGRID_SENDER_EMAIL } = require('../../core/config');

// *************** IMPORT UTILITES ***************
const CommonHelper = require('../../shared/helper/index')

// *************** IMPORT VALIDATOR ***************
const CommonValidator = require('../../shared/validator/index');
const TaskValidator = require('./task.validator');

/**
 * Processes and transforms a raw task input object into a structured data payload for a create operation.
 * @param {object} args - The arguments for creating the payload.
 * @param {object} args.taskInput - The raw input object containing the task's properties.
 * @param {string} args.userId - The ID of the user creating the task.
 * @returns {object} A processed data payload suitable for a database create operation.
 */
function GetCreateTaskPayload({ taskInput, userId }) {
    CommonValidator.ValidateInputTypeObject(taskInput);
    CommonValidator.ValidateObjectId(userId);
    TaskValidator.ValidateTaskInput({ taskInput });

    const {
        test,
        user,
        title,
        description,
        task_type,
        due_date
    } = taskInput;

    return {
        test: test,
        user: user,
        title: title,
        description: description,
        task_type: task_type.toUpperCase(),
        task_status: 'PENDING',
        due_date: due_date,
        created_by: userId,
        updated_by: userId
    };
}

/**
 * Processes and transforms a raw task input object into a structured data payload for an update operation.
 * @param {object} args - The arguments for creating the payload.
 * @param {object} args.taskInput - The raw input object containing the task's properties to update.
 * @param {string} args.userId - The ID of the user updating the task.
 * @returns {object} A processed data payload suitable for a database update operation.
 */
function GetUpdateTaskPayload({ taskInput, userId }) {
    CommonValidator.ValidateInputTypeObject(taskInput);
    CommonValidator.ValidateObjectId(userId);
    TaskValidator.ValidateTaskInput({ taskInput });

    const {
        user,
        title,
        description,
        task_type,
        task_status,
        due_date
    } = taskInput;

    const payload = {};

    if (user !== undefined && user !== null) payload.user = user;
    if (title !== undefined && title !== null) payload.title = title;
    if (description !== undefined && description !== null) payload.description = description;
    if (task_type !== undefined && task_type !== null) payload.task_type = task_type.toUpperCase();
    if (task_status !== undefined && task_status !== null) payload.task_status = task_status.toUpperCase();
    if (due_date !== undefined && due_date !== null) payload.due_date = due_date;

    payload.updated_by = userId;

    return payload;
}

/**
 * Fetches a single task document by its ID and validates its contents.
 * @param {string} taskId - The ID of the task to fetch.
 * @returns {Promise<object>} A promise that resolves to the found task document.
 */
async function GetDeleteTaskPayload({ taskId, userId }) {
    try {
        CommonValidator.ValidateObjectId(taskId);
        CommonValidator.ValidateObjectId(userId);

        const deletionTimestamp = Date.now();

        const task = await TaskModel.findOne({ _id: taskId, task_status: { $ne: 'DELETED' } });
        if (!task) {
            throw new ApolloError('Task not found', 'TASK_NOT_FOUND');
        }

        const testId = task.test;

        const deleteTaskPayload = {
            task: CommonHelper.BuildDeletePayload({
                ids: [taskId],
                statusKey: 'task_status',
                timestamp: deletionTimestamp,
                userId
            }),
            test: BuildPullTaskFromTestPayload(testId, taskId)
        };

        return deleteTaskPayload;
    } catch (error) {
        throw new ApolloError(`Failed to build delete task payload: ${error.message}`, 'GET_DELETE_TASK_PAYLOAD_FAILED', {
            error: error.message
        });
    }
}

/**
 * Builds a payload for removing a task's ID from a test's 'tasks' array.
 * @param {string} testId - The ID of the test to update.
 * @param {string} taskId - The ID of the task to remove.
 * @returns {object} An object containing 'filter' and 'update' properties for a MongoDB $pull operation.
 */
function BuildPullTaskFromTestPayload(testId, taskId) {
    return {
        filter: { _id: testId },
        update: { $pull: { tasks: taskId } }
    };
}

/**
 * Creates the payload for marking a task as completed.
 * @param {string} userId - The ID of the user completing the task.
 * @returns {object} A data payload for the update operation.
 */
function GetTaskCompletionPayload(userId) {
    CommonValidator.ValidateObjectId(userId);

    return {
        task_status: 'COMPLETED',
        completed_by: userId,
        completed_at: Date.now(),
        updated_by: userId
    };
}

/**
 * Creates the full payload for a new student test result document.
 * @param {object} args - The arguments for creating the payload.
 * @param {object} args.enterMarksInput - The input object containing test, student, and marks data.
 * @param {string} args.userId - The ID of the user creating the result.
 * @param {object} args.parentTest - The parent test document, used for validation.
 * @returns {object} A data payload for creating the new student test result.
 */
function GetStudentTestResultPayload({ enterMarksInput, userId, notations }) {
    CommonValidator.ValidateInputTypeObject(enterMarksInput);
    CommonValidator.ValidateObjectId(userId);
    TaskValidator.ValidateEnterMarksInput({ enterMarksInput, notations });

    const { test, student, marks } = enterMarksInput;

    let totalMarks = 0;

    for (const item of marks) {
        totalMarks += item.mark
    }

    const averageMark = marks.length ? (totalMarks / marks.length) : 0;

    return {
        student: student,
        test: test,
        marks: marks,
        average_mark: Number(averageMark.toFixed(2)),
        mark_entry_date: Date.now(),
        student_test_result_status: 'PENDING',
        created_by: userId,
        updated_by: userId
    };
}

/**
 * Creates the payload for validating a student's test result.
 * @param {string} userId - The ID of the user validating the result.
 * @returns {object} A data payload for the update operation.
 */
function GetStudentTestResultValidationPayload(userId) {
    CommonValidator.ValidateObjectId(userId)
    return {
        student_test_result_status: 'VALIDATED',
        marks_validated_date: Date.now(),
        updated_by: userId
    };
}

/**
 * Constructs the content for the 'Assign Corrector' email notification.
 * @param {object} args - The arguments for creating the email content.
 * @param {object} args.test - The test document object.
 * @param {object} args.subject - The subject document object.
 * @param {Array<object>} args.students - An array of student document objects.
 * @returns {object} An object containing the email 'subject' and 'html' content.
 */
function GetAssignCorrectorEmail({ test, subject, students }) {
    const studentNames = students.map(function (student) {
        return student.first_name + ' ' + student.last_name;
    });

    const subjectMsg = 'You have been assigned as a Test Corrector!';

    const html = `
    <h2>You have been assigned as a Test Corrector!</h2>
    <p><strong>Test Name:</strong> ${test.name}</p>
    <p><strong>Subject:</strong> ${subject.name}</p>
    <p><strong>Description:</strong> ${test.description}</p>
    <p><strong>Students to Correct:</strong></p>
    <ol>
        ${studentNames.map(function (name) {
        return `<li>${name}</li>`;
    }).join('')}
    </ol>
`;

    return { subject: subjectMsg, html: html };
}

/**
 * Sends an email using the SendGrid service with error handling.
 * @param {object} args - The arguments for sending the email.
 * @param {string} args.to - The email address of the recipient.
 * @param {string} args.subject - The subject line of the email.
 * @param {string} args.html - The HTML content for the email body.
 * @returns {Promise<object>} - A promise that resolves to an object indicating the outcome of the email sending attempt.
 */
async function SendEmailWithSendGrid({ to, subject, html }) {
    try {
        sgMail.setApiKey(SENDGRID_API_KEY);

        const msg = {
            to,
            from: SENDGRID_SENDER_EMAIL,
            subject,
            html
        };

        const [response] = await sgMail.send(msg);

        return {
            success: response.statusCode >= 200 && response.statusCode < 300,
            statusCode: response.statusCode
        };
    } catch (error) {
        console.error('SendGrid Error:', error.message || error);
        return {
            success: false,
            error: error.message || 'Unknown error'
        };
    }
}

// *************** EXPORT MODULE ***************
module.exports = {
    GetCreateTaskPayload,
    GetUpdateTaskPayload,
    GetDeleteTaskPayload,
    GetTaskCompletionPayload,
    GetStudentTestResultPayload,
    GetStudentTestResultValidationPayload,
    GetAssignCorrectorEmail,
    SendEmailWithSendGrid
}