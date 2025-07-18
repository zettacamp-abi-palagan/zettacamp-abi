// *************** IMPORT LIBRARY ***************
const { gql } = require('apollo-server-express');

// *************** EXPORT MODULE ***************
module.exports = gql`
    enum TaskType {
        ASSIGN_CORRECTOR
        ENTER_MARKS
        VALIDATE_MARKS
    }

    enum TaskStatus {
        PENDING
        IN_PROGRESS
        COMPLETED
        DELETED
    }

    input MarkInput {
        notation_text: String!
        mark: Float!
    }

    input EnterMarksInput {
        test: ID!
        student: ID!
        marks: [MarkInput!]!
    }

    input CreateTaskInput {
        test: ID!
        user: ID!
        title: String!
        description: String!
        task_type: TaskType!
        due_date: String
    }

    input UpdateTaskInput {
        user: ID!
        title: String!
        description: String!
        task_type: TaskType!
        task_status: TaskStatus!
        due_date: String
    }

    type Task {
        _id: ID!
        test: Test!
        user: User!
        title: String!
        description: String!
        task_type: TaskType!
        task_status: TaskStatus!
        due_date: String
        completed_by: User
        completed_at: String
        created_by: User!
        created_at: String!
        updated_by: User!
        updated_at: String!
        deleted_by: User
        deleted_at: String
    }

    type EnterMarksPayload {
        student_test_result: StudentTestResult!
        validate_marks_task: Task!
    }

    type ValidateMarksPayload {
        student_test_result: StudentTestResult!
        validate_marks_task: Task!
    }

    type Query {
        GetAllTasks(task_status: TaskStatus, test_id: ID, user_id: ID): [Task]!
        GetOneTask(id: ID!): Task
        GetTasksForUser(user_id: ID!, task_status: TaskStatus): [Task]
        GetTasksForTest(test_id: ID!, task_status: TaskStatus): [Task]
    }

    type Mutation {
        CreateTask(createTaskInput: CreateTaskInput!): Task!
        UpdateTask(id: ID!, updateTaskInput: UpdateTaskInput!): Task!
        DeleteTask(id: ID!): Task!
        AssignCorrector(task_id: ID!, corrector_id: ID!, enter_marks_due_date: String): Task!
        EnterMarks(task_id: ID!, enterMarksInput: EnterMarksInput!, validate_marks_due_date: String): EnterMarksPayload!
        ValidateMarks(task_id: ID!, student_test_result_id: ID!): ValidateMarksPayload!
    }
`