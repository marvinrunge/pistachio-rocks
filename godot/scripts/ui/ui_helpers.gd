class_name Ui
extends RefCounted
## Small helpers shared by the UI screens.


## Removes and frees every child of [param parent] immediately.
##
## [method Node.queue_free] alone is deferred, so freshly rebuilt lists would
## briefly contain both the old and the new children.
static func clear_children(parent: Node) -> void:
	for child in parent.get_children():
		parent.remove_child(child)
		child.queue_free()
