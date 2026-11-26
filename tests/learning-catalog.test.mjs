import test from "node:test";
import assert from "node:assert/strict";
import { KLIN_LEARNING_COURSES, getKlinCourse } from "../lib/learning-catalog.ts";

test("learning catalog has unique courses and lesson keys", () => {
  const courseKeys = KLIN_LEARNING_COURSES.map((course) => course.key);
  assert.equal(new Set(courseKeys).size, courseKeys.length);
  for (const course of KLIN_LEARNING_COURSES) {
    assert.ok(course.lessons.length >= 3);
    const lessonKeys = course.lessons.map((lesson) => lesson.key);
    assert.equal(new Set(lessonKeys).size, lessonKeys.length);
    assert.ok(course.lessons.every((lesson) => lesson.estimated_minutes > 0));
    assert.equal(course.estimated_minutes_total, course.lessons.reduce((sum, lesson) => sum + lesson.estimated_minutes, 0));
  }
});

test("learning course lookup returns a matching course or null", () => {
  assert.equal(getKlinCourse("ai-foundations")?.title, "AI Foundations");
  assert.equal(getKlinCourse("missing-course"), null);
});
