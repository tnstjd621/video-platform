-- scripts/010_create_progress_view.sql

create or replace view public.v_progress_admin as
select
  sp.student_id,
  p.name  as student_name,
  p.email as student_email,
  -- 한 학생이 여러 반에 있을 수 있으니 표시용으로 묶어준다
  string_agg(distinct c.name, ', ' order by c.name) as classrooms,
  v.id     as video_id,
  v.title  as video_title,
  v.duration as video_duration,
  cat.id   as category_id,
  cat.name as category_name,
  sp.watched_duration,
  round( case when v.duration > 0
              then (sp.watched_duration::numeric / v.duration) * 100
              else 0 end , 2) as percent_viewed,
  sp.completed,
  sp.last_watched_at
from student_progress sp
join profiles p on p.id = sp.student_id
join videos   v on v.id = sp.video_id
left join categories cat on cat.id = v.category_id
left join classroom_students cs on cs.student_id = sp.student_id
left join classrooms c on c.id = cs.classroom_id
group by sp.student_id, p.name, p.email, v.id, v.title, v.duration, cat.id, cat.name, sp.watched_duration, sp.completed, sp.last_watched_at;

-- 성능 보조 인덱스(없으면 추가)
create index if not exists idx_student_progress_lastwatch on student_progress(last_watched_at desc);
create index if not exists idx_student_progress_student on student_progress(student_id);
create index if not exists idx_student_progress_video on student_progress(video_id);
