const { DataSource } = require('typeorm');

// Fix rubric assessments to use correct level proportions
async function fixRubricLevelProportions() {
  console.log('🔧 Starting LEVEL PROPORTION fix for rubric assessments...');

  // Database configuration
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'mwpanel',
    password: process.env.DB_PASSWORD || 'mwpanel123',
    database: process.env.DB_NAME || 'mwpanel',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Find all assessments 
    const allAssessments = await dataSource.query(`
      SELECT 
        tra.id,
        tra."taskSubmissionId",
        tra."rubricId",
        tra."studentId",
        tra."totalScore",
        tra.percentage,
        tra."maxPossibleScore"
      FROM task_rubric_assessments tra 
    `);

    console.log(`🎯 Found ${allAssessments.length} assessments to fix with correct level proportions`);

    for (const assessment of allAssessments) {
      console.log(`\n📊 Processing assessment ${assessment.id}...`);

      // Get rubric info and ALL levels to determine max level score
      const rubricInfo = await dataSource.query(`
        SELECT 
          r."maxScore",
          ARRAY_AGG(rl."scoreValue" ORDER BY rl."order") as level_scores
        FROM rubrics r 
        LEFT JOIN rubric_levels rl ON rl."rubricId" = r.id
        WHERE r.id = $1
        GROUP BY r."maxScore"
      `, [assessment.rubricId]);

      if (rubricInfo.length === 0) {
        console.log(`⚠️  No rubric found for assessment ${assessment.id}`);
        continue;
      }

      const rubricData = rubricInfo[0];
      const levelScores = rubricData.level_scores || [];
      const maxLevelScore = levelScores.length > 0 ? Math.max(...levelScores.map(s => parseFloat(s))) : 4;
      
      console.log(`📈 Rubric level scores: [${levelScores.join(', ')}], Max: ${maxLevelScore}`);

      // Get criteria assessments for this rubric assessment
      const criteriaAssessments = await dataSource.query(`
        SELECT 
          trac."criterionId",
          trac."levelId", 
          trac.score,
          trac."weightedScore" as old_weighted_score,
          rc.weight as criterion_weight,
          rl."scoreValue" as level_score
        FROM task_rubric_assessment_criteria trac
        JOIN rubric_criteria rc ON rc.id = trac."criterionId"
        JOIN rubric_levels rl ON rl.id = trac."levelId"
        WHERE trac."taskRubricAssessmentId" = $1
        ORDER BY rc."order"
      `, [assessment.id]);

      if (criteriaAssessments.length === 0) {
        console.log(`⚠️  No criteria assessments found for assessment ${assessment.id}`);
        continue;
      }

      // CORRECT CALCULATION WITH LEVEL PROPORTIONS
      let totalPoints = 0;
      let hasChanges = false;

      console.log('📈 CORRECTED level proportion calculations:');
      for (const criterion of criteriaAssessments) {
        const levelScore = parseFloat(criterion.level_score); // e.g., 2
        const criterionWeight = parseFloat(criterion.criterion_weight); // e.g., 0.15
        const oldWeightedScore = parseFloat(criterion.old_weighted_score); // Current wrong value
        
        // CORRECT FORMULA WITH LEVEL PROPORTIONS:
        // Step 1: Calculate level achievement proportion
        const levelProportion = levelScore / maxLevelScore; // e.g., 2/4 = 0.50 (50% achievement)
        
        // Step 2: Apply to criterion weight to get points
        const criterionMaxPoints = criterionWeight * 100; // e.g., 0.15 * 100 = 15 points possible
        const earnedPoints = levelProportion * criterionMaxPoints; // e.g., 0.50 * 15 = 7.5 points
        
        // Step 3: Calculate correct weighted score for storage (matches old format for compatibility)
        const correctWeightedScore = levelScore * criterionWeight; // Keep this for database
        
        totalPoints += earnedPoints;
        
        console.log(`  - Level ${levelScore}/${maxLevelScore} = ${(levelProportion*100).toFixed(1)}% achievement`);
        console.log(`  - Weight: ${(criterionWeight*100).toFixed(1)}% (${criterionMaxPoints} max points)`);
        console.log(`  - Earned: ${earnedPoints.toFixed(2)} points`);
        console.log(`  - Old weighted: ${oldWeightedScore.toFixed(3)} → New: ${correctWeightedScore.toFixed(3)}`);
        
        // Update the criterion assessment with correct weighted score if changed
        if (Math.abs(oldWeightedScore - correctWeightedScore) > 0.001) {
          hasChanges = true;
          await dataSource.query(`
            UPDATE task_rubric_assessment_criteria 
            SET "weightedScore" = $1
            WHERE "taskRubricAssessmentId" = $2 AND "criterionId" = $3
          `, [correctWeightedScore, assessment.id, criterion.criterionId]);
        }
      }

      const finalScore = Math.round(totalPoints * 100) / 100;
      const finalPercentage = finalScore; // Since we're already in 100-point scale

      console.log(`📊 CORRECTED calculation results:`);
      console.log(`  - Total Points: ${finalScore}`);
      console.log(`  - Percentage: ${finalPercentage}%`);
      console.log(`  - Old score: ${parseFloat(assessment.totalScore || 0).toFixed(2)}`);
      console.log(`  - Changes needed: ${hasChanges ? 'YES' : 'NO'}`);

      // Update the assessment with correct values if changed
      const oldScore = parseFloat(assessment.totalScore || 0);
      if (Math.abs(oldScore - finalScore) > 0.01 || hasChanges) {
        await dataSource.query(`
          UPDATE task_rubric_assessments 
          SET 
            "totalScore" = $1,
            percentage = $2,
            "maxPossibleScore" = 100,
            "updatedAt" = NOW()
          WHERE id = $3
        `, [finalScore, finalPercentage, assessment.id]);

        // Also update the task submission grade
        await dataSource.query(`
          UPDATE task_submissions 
          SET 
            grade = $1,
            "finalGrade" = $1,
            "isGraded" = true,
            status = 'graded'
          WHERE id = $2
        `, [finalScore, assessment.taskSubmissionId]);

        console.log(`✅ Updated assessment with LEVEL PROPORTION correction`);
      } else {
        console.log(`ℹ️  Assessment already correct`);
      }
    }

    console.log(`\n🎉 Successfully fixed level proportions for ${allAssessments.length} assessments!`);
    
    // Show a summary of level proportion logic
    console.log(`\n📚 LEVEL PROPORTION LOGIC APPLIED:`);
    console.log(`   For 4-level rubric: Level 1=25%, Level 2=50%, Level 3=75%, Level 4=100%`);
    console.log(`   For 3-level rubric: Level 1=33%, Level 2=67%, Level 3=100%`);
    console.log(`   For 5-level rubric: Level 1=20%, Level 2=40%, Level 3=60%, Level 4=80%, Level 5=100%`);

  } catch (error) {
    console.error('❌ Error fixing level proportions:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixRubricLevelProportions().catch(console.error);