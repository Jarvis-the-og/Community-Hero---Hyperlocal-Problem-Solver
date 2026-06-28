import { generateText } from '../services/gemini/index.js';
import { CHAT_PROMPT } from '../services/gemini/prompts/index.js';
import { getIssues, getNearbyIssues, getIssueById } from '../services/issueService.js';

export async function chat(req, res, next) {
  try {
    const { message, issueId, lat, lng } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    let context = '';

    if (issueId) {
      const issue = await getIssueById(issueId);
      if (issue) {
        context += `\nCurrent issue: "${issue.title}" - Status: ${issue.status}, Priority: ${issue.priority}`;
      }
    }

    if (lat && lng) {
      const nearby = await getNearbyIssues(parseFloat(lat), parseFloat(lng), 2);
      if (nearby.length) {
        context += `\nNearby issues (${nearby.length}): ${nearby.slice(0, 5).map((i) => i.title).join(', ')}`;
      }
    }

    const userIssues = await getIssues({ reporterId: req.user.uid });
    if (userIssues.length) {
      context += `\nUser's reports: ${userIssues.map((i) => `"${i.title}" (${i.status})`).join(', ')}`;
    }

    const prompt = `${CHAT_PROMPT}\n\nContext:${context}\n\nUser: ${message}\n\nAssistant:`;

    const response = await generateText(prompt);
    res.json({ reply: response.trim() });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.json({
      reply: "I'm having trouble connecting right now. You can report issues from the Report page, track them in My Issues, or view nearby problems on the Map.",
    });
  }
}
