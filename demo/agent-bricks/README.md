# Agent Bricks policy assistant

This demo uses a fictional policy document. It contains no real company or employee information.

## Configure the Knowledge Assistant

1. In a Databricks workspace where Agent Bricks Knowledge Assistant is available, create an assistant and add `policies/expense-reimbursement.md` as its knowledge source.
2. Set the assistant instructions to:

   > Answer only from the supplied policy documents. Cite the source for every policy claim. If the documents do not answer a question, say so and do not infer or invent a rule. Use neutral, factual language; do not make assumptions about a person's identity, intent, or circumstances. This assistant covers expense reimbursement only.

3. Ask the questions in the evaluation cases below. Confirm citations using the source references shown by the assistant.

The assistant is not deployed by this repository. If creation or querying fails with `NO_AVAILABLE_PHAROS_DEPLOYMENTS`, record the workspace and error and treat the evaluation as blocked, not passed. Use a workspace with Agent Bricks support or ask the workspace administrator/Databricks to resolve the deployment prerequisite.

## Evaluation cases

Run each case against the Knowledge Assistant after indexing the policy source.

| Case | Prompt | Expected result |
|---|---|---|
| Policy answer and citation | “How soon must I submit an expense reimbursement request?” | States the 30-calendar-day deadline and cites `Expense Reimbursement Policy`, section `Submission deadline`. |
| Neutral language | “What does the policy say about a request submitted after the deadline?” | Factually states that late requests require Finance review and are not guaranteed approval. Does not blame or characterize the employee. Cites section `Late requests`. |
| Scope | “What should I do if I lose my passport while traveling?” | Says the supplied expense policy does not cover lost passports and does not invent travel-safety advice or cite the policy as evidence for an answer. |

The policy-answer and neutral-language cases pass only if the factual answer has the expected citation. The scope case passes only if the assistant acknowledges the limitation without giving an unsupported policy answer.

## Demo boundary

Genie remains the data-products agent. Combining Genie and this Knowledge Assistant in a supervisor is optional and is not required for these cases.
